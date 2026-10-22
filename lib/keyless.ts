// Keyless mode: the free no-key model caps each reply at ~1,500 tokens, so big
// jobs are split into small AI calls and assembled in code.
import { z } from "zod";
import { AnalysisSchema, type Analysis } from "./schema";
import { engineForPrompt, type EngineResult } from "./engine";
import { generateJSON, AI } from "./llm";
import { THEME_SYSTEM, buildThemeUserMessage, type BrandStyle, type GeneratedSection } from "./theme";

const D = AnalysisSchema.shape.dashboard.shape;

// ---------- Troubleshooter ----------

const FindingsSchema = z.object({
  header: D.header,
  root_cause: z.string(),
  layers: D.layers,
  data_gaps: z.array(z.string()),
});

const PlanSchema = z.object({
  states: D.states,
  campaigns: D.campaigns,
  actions: D.actions,
  recovery_target: z.string(),
});

const COMPACT = `\n\n## Keyless compact mode\nYour reply has a hard limit of about 1,000 words, including any thinking. Be brief: each finding or detail under 25 words. Return only the JSON asked for.`;

export async function analyzeKeyless(system: string, data: string, engine: EngineResult): Promise<Analysis> {
  const context = [
    "<engine_output>",
    "Computed in code from the PnL. Authoritative: use exactly, do not recompute.",
    engineForPrompt(engine),
    "</engine_output>",
    "",
    `<seller_data>\n${data}\n</seller_data>`,
  ].join("\n");

  const findings = await generateJSON({
    model: AI.models.analyze,
    maxTokens: 1500,
    system: system + COMPACT,
    schema: FindingsSchema,
    user: `${context}\n\nTask: run Steps 1–8 and return ONLY: header, root_cause (one cross-cut sentence, Campaign × Dimension, with numbers), layers (one per layer: Macro, Fulfilment, Gender, Age, Platform, Geo, Product, Campaign, Changelog; status ruled_out | signal | flagged | not_available; finding under 25 words), data_gaps.`,
  });

  const plan = await generateJSON({
    model: AI.models.analyze,
    maxTokens: 1500,
    system: system + COMPACT,
    schema: PlanSchema,
    user: `${context}\n\nThe root cause is: ${findings.root_cause}\n\nTask: return ONLY: states (up to 8 largest, benchmark and loss-week RTO % and loss-week order share %, numbers from the data or null), campaigns (up to 6, benchmark and loss spend and S/GMV %, from the data or null), actions (3–5, priority 1 first, naming the specific campaigns, SKUs or states and an owner team), recovery_target (one sentence with ₹ per pp).`,
  });

  const dashboard: Analysis["dashboard"] = {
    header: findings.header,
    loss_week_gmv: engine.ok ? engine.loss_week.gmv : null,
    loss_week_net_profit_pct: engine.ok ? engine.loss_week.np : null,
    metrics: engine.ok
      ? engine.metrics.map((m) => ({ metric: m.metric, benchmark: m.benchmark, loss_week: m.loss_week, delta_pp: m.delta_pp, flagged: m.flagged, impact_inr: m.impact_inr }))
      : [],
    states: plan.states,
    campaigns: plan.campaigns,
    layers: findings.layers,
    root_cause: findings.root_cause,
    actions: plan.actions,
    recovery_target: plan.recovery_target,
    data_gaps: findings.data_gaps,
  };
  return { dashboard, report_markdown: buildReport(dashboard, engine) };
}

const STATUS_LABEL: Record<string, string> = {
  ruled_out: "✅ RULED OUT", signal: "⚠️ SIGNAL", flagged: "🔴 FLAGGED", not_available: "— Data needed",
};
const inr = (n: number | null | undefined) => (n == null ? "—" : `₹${Math.round(n).toLocaleString("en-IN")}`);
const cell = (s: string) => s.replace(/\|/g, "/").replace(/\n/g, " ");

function buildReport(d: Analysis["dashboard"], e: EngineResult): string {
  const out: string[] = [];
  out.push(`# Case study: ${d.header.seller}`);
  out.push(`**Loss week:** ${d.header.loss_week} · **Benchmark:** ${d.header.benchmark} (${d.header.benchmark_quality}) · **Primary lens:** ${d.header.primary_lens}`);
  out.push(`> Compact report generated in free keyless mode. Steps 1–2 are computed in code; the findings in Steps 3–8 are the AI's.`);

  out.push(`## Step 1: Benchmark selection`);
  if (e.ok && e.benchmark) {
    out.push(`Selected **${e.benchmark.weeks.join(", ")}** · ${e.benchmark.method} · spend diff ${e.benchmark.spend_diff_pct}% · quality: ${e.benchmark.quality}.`);
    if (e.benchmark.warnings.length) out.push(e.benchmark.warnings.map((w) => `- ⚠️ ${w}`).join("\n"));
  } else {
    out.push(`⚠️ ${e.ok ? "No benchmark." : e.reason}`);
  }

  out.push(`## Step 2: Problem metrics`);
  if (e.ok) {
    out.push([
      "| Metric | Benchmark | Loss week | Delta | Threshold | Flag | ₹ Impact | % of loss |",
      "|---|---|---|---|---|---|---|---|",
      ...e.metrics.map((m) => `| ${m.metric} | ${m.benchmark}% | ${m.loss_week}% | ${m.delta_pp > 0 ? "+" : ""}${m.delta_pp}pp | +${m.threshold_pp}pp | ${m.flagged ? "🔴" : "✅"} | ${inr(m.impact_inr)} | ${m.pct_of_loss != null ? `${m.pct_of_loss}%` : "—"} |`),
    ].join("\n"));
    out.push(`**Primary lens:** ${e.primary}${e.downstream_sgmv ? " (S/GMV is downstream of RTO/COGS)" : ""}. Loss-week GMV ${inr(e.loss_week.gmv)}, net profit ${e.loss_week.np}% (≈ ${inr(e.loss_amount_inr)} loss).`);
    if (e.cogs_note) out.push(`📌 ${e.cogs_note}`);
  } else {
    out.push("Numbers unverifiable from PnL.");
  }

  out.push(`## Steps 3–8: Layer findings`);
  out.push(["| Layer | Verdict | Finding |", "|---|---|---|", ...d.layers.map((l) => `| ${cell(l.layer)} | ${STATUS_LABEL[l.status] ?? l.status} | ${cell(l.finding)} |`)].join("\n"));

  out.push(`## 🎯 Root cause`);
  out.push(d.root_cause);

  out.push(`## Action plan`);
  out.push(["| Priority | Action | Detail |", "|---|---|---|", ...[...d.actions].sort((a, b) => a.priority - b.priority).map((a) => `| ${a.priority} | ${cell(a.action)} | ${cell(a.detail)} |`)].join("\n"));
  out.push(`**Recovery target:** ${d.recovery_target}`);

  if (d.data_gaps.length) {
    out.push(`## 📌 Data that would sharpen this`);
    out.push(d.data_gaps.map((g) => `- ${g}`).join("\n"));
  }
  return out.join("\n\n");
}

// ---------- Section Studio ----------

const LiquidPart = z.object({ name: z.string(), summary: z.string(), liquid: z.string() });
const PreviewPart = z.object({ preview_html: z.string() });

export async function sectionKeyless(
  prompt: string,
  style: BrandStyle,
  model: string,
  previous?: { liquid: string; preview_html: string },
): Promise<GeneratedSection> {
  const compact = `${COMPACT}\nKeep the section compact: at most 8 settings, at most 4 block types, under 120 lines of Liquid.`;
  const part1 = await generateJSON({
    model,
    maxTokens: 1500,
    system: THEME_SYSTEM + compact,
    schema: LiquidPart,
    user: `${buildThemeUserMessage(prompt, style, previous ? { liquid: previous.liquid, preview_html: "(omitted)" } : undefined)}\n\nReturn ONLY name, summary and liquid in this step; the preview is made separately.`,
  });

  const part2 = await generateJSON({
    model,
    maxTokens: 1500,
    system: `You turn a Shopify section into a static HTML preview.${COMPACT}\nRules: body content plus one <style> tag; no <script>, no <html>/<head>/<body>, no external images (use CSS gradients or inline SVG). Render the default settings and blocks with realistic copy for the brand. Responsive, matching the section's layout and the brand style.`,
    schema: PreviewPart,
    user: `Brand: ${style.brand || "Untitled store"} · primary ${style.primary} · accent ${style.accent} · font "${style.font}" · ${style.corners} corners · ${style.vibe}\n\n<section_liquid>\n${part1.liquid}\n</section_liquid>\n\nReturn ONLY preview_html.`,
  });

  return { ...part1, preview_html: part2.preview_html };
}
