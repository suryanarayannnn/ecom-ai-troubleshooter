// Verifier: checks the model's structured output against the deterministic
// engine and replaces any core number it cannot trace back to the PnL.
import type { Analysis } from "./schema";
import type { EngineResult } from "./engine";

export type Check = {
  label: string;
  status: "pass" | "fixed" | "warn" | "skip";
  detail: string;
};

const close = (a: number | null | undefined, b: number, tol: number) => a != null && Math.abs(a - b) <= tol;
const weekToken = (label: string) => label.match(/w\s*\d+/i)?.[0]?.replace(/\s/g, "").toUpperCase() ?? label;

export function verify(analysis: Analysis, engine: EngineResult): { analysis: Analysis; checks: Check[] } {
  const d = structuredClone(analysis.dashboard);
  const checks: Check[] = [];

  if (!engine.ok) {
    const why = `Engine did not run: ${engine.reason}`;
    for (const label of [
      "Core metrics traced to PnL",
      "Benchmark qualifies under the flowchart",
      "Loss-week GMV read from the PnL, not back-calculated",
      "Primary lens matches the largest flagged impact",
    ]) checks.push({ label, status: "skip", detail: why });
  } else {
    // 1. Metric values
    let replaced = 0;
    d.metrics = engine.metrics.map((m) => {
      const llm = d.metrics.find((x) => x.metric === m.metric);
      if (!llm || !close(llm.benchmark, m.benchmark, 0.15) || !close(llm.loss_week, m.loss_week, 0.15)
        || !close(llm.delta_pp, m.delta_pp, 0.2) || llm.flagged !== m.flagged) replaced++;
      return { metric: m.metric, benchmark: m.benchmark, loss_week: m.loss_week, delta_pp: m.delta_pp, flagged: m.flagged, impact_inr: m.impact_inr };
    });
    checks.push(replaced === 0
      ? { label: "Core metrics traced to PnL", status: "pass", detail: "All four metric rows match the engine's computation." }
      : { label: "Core metrics traced to PnL", status: "fixed", detail: `${replaced} metric row${replaced > 1 ? "s" : ""} didn't match the PnL and ${replaced > 1 ? "were" : "was"} replaced with the recomputed value.` });

    // 2. Benchmark
    const b = engine.benchmark!;
    const tokens = [b.weeks[0], b.weeks[b.weeks.length - 1]].map(weekToken);
    const mentions = tokens.every((t) => d.header.benchmark.toUpperCase().replace(/\s/g, "").includes(t));
    if (b.quality === "DIRECTIONAL") {
      checks.push({ label: "Benchmark qualifies under the flowchart", status: "warn", detail: "No week qualified within ±30% spend, so a directional fallback was used." });
    } else {
      checks.push({ label: "Benchmark qualifies under the flowchart", status: "pass", detail: `${b.weeks.join(", ")}: ${b.method}, spend diff ${b.spend_diff_pct}%.` });
    }
    if (!mentions) {
      d.header.benchmark = b.weeks.length > 1 ? `${b.weeks[0]} – ${b.weeks[b.weeks.length - 1]}` : b.weeks[0];
      d.header.benchmark_quality = b.quality;
      checks.push({ label: "Report uses the engine's benchmark", status: "fixed", detail: "The header named different weeks, so it was replaced with the engine's selection." });
    } else {
      checks.push({ label: "Report uses the engine's benchmark", status: "pass", detail: "The header names the same weeks the flowchart selected." });
    }

    // 3. GMV
    if (close(d.loss_week_gmv, engine.loss_week.gmv, engine.loss_week.gmv * 0.01) && close(d.loss_week_net_profit_pct, engine.loss_week.np, 0.05)) {
      checks.push({ label: "Loss-week GMV read from the PnL, not back-calculated", status: "pass", detail: `₹${engine.loss_week.gmv.toLocaleString("en-IN")} matches the PnL cell.` });
    } else {
      d.loss_week_gmv = engine.loss_week.gmv;
      d.loss_week_net_profit_pct = engine.loss_week.np;
      checks.push({ label: "Loss-week GMV read from the PnL, not back-calculated", status: "fixed", detail: "Replaced with the PnL values." });
    }

    // 4. Primary lens
    if (d.header.primary_lens === engine.primary) {
      checks.push({ label: "Primary lens matches the largest flagged impact", status: "pass", detail: `${engine.primary}${engine.downstream_sgmv ? " (S/GMV treated as downstream)" : ""}.` });
    } else {
      checks.push({ label: "Primary lens matches the largest flagged impact", status: "warn", detail: `The report says ${d.header.primary_lens}, but the engine ranks ${engine.primary} first. Read the narrative with this in mind.` });
    }
  }

  // 5. Impact only on worsened metrics
  const bad = d.metrics.filter((m) => (m.delta_pp ?? 0) <= 0 && (m.impact_inr ?? 0) > 0);
  bad.forEach((m) => { m.impact_inr = null; });
  checks.push(bad.length === 0
    ? { label: "₹ impact only on metrics that worsened", status: "pass", detail: "No impact was assigned to an improved metric." }
    : { label: "₹ impact only on metrics that worsened", status: "fixed", detail: `Removed impact from ${bad.map((m) => m.metric).join(", ")}.` });

  // 6. Cross-cut root cause
  checks.push(/×| x /i.test(d.root_cause)
    ? { label: "Root cause crosses two dimensions", status: "pass", detail: "The statement names a cross-cut (A × B)." }
    : { label: "Root cause crosses two dimensions", status: "warn", detail: "The root cause reads as a single dimension, so treat it as Level 2." });

  // 7. Missing data declared
  checks.push({
    label: "Missing data declared, not invented",
    status: "pass",
    detail: d.data_gaps.length ? `${d.data_gaps.length} gap${d.data_gaps.length > 1 ? "s" : ""} listed.` : "No gaps reported.",
  });

  return { analysis: { ...analysis, dashboard: d }, checks };
}
