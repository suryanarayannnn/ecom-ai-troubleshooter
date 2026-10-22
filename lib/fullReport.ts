// Full troubleshoot report: Diagnose → Strategy → Action, rendered as a
// standalone HTML document. Numbers come from the engine; the AI writes the reasoning.
import { z } from "zod";
import type { Analysis } from "./schema";
import { engineForPrompt, type EngineResult } from "./engine";
import { AI, KEYLESS, generateJSON } from "./llm";

// ---------- AI content ----------

const Diagnose = z.object({
  bottom_line: z.string(),
  why: z.array(z.object({ claim: z.string(), evidence: z.string() })),
  working: z.string(),
  bounds: z.array(z.string()),
});

const Strategy = z.object({
  objective: z.string(),
  strategies: z.array(z.object({
    title: z.string(),
    goal: z.string(),
    mechanism: z.string(),
    actions: z.array(z.string()),
    measuring: z.string(),
  })),
  not_doing: z.array(z.object({ item: z.string(), reason: z.string() })),
  cycles: z.array(z.string()),
});

const Actions = z.object({
  actions: z.array(z.object({
    title: z.string(),
    strategy: z.number().nullable(),
    evidence: z.string(),
    lever: z.string(),
    approach: z.string(),
    expected: z.string(),
    avoid: z.string(),
  })),
  sequencing: z.array(z.string()),
  checklist: z.array(z.string()),
});

const ReportContent = Diagnose.extend(Strategy.shape).extend(Actions.shape);
export type ReportContent = z.infer<typeof ReportContent>;

const SYSTEM = `You are a senior e-commerce growth analyst writing a troubleshoot report for a D2C store that sells through Meta ads. The report has three stages: Diagnose, Strategy, Action plan.

Rules:
- Every number you quote must come from <engine_output>, <findings> or <seller_data>. Never invent figures; write "(estimate)" when you infer one.
- Be specific: name the campaigns, SKUs, states and percentages from the data.
- Plain, direct sentences. No filler.
- Strategies: at most 3, each tied to a flagged lever and the root cause. Actions: concrete operator steps with a lever (Campaign, Audience, Geography, Catalogue, Pricing, Logistics or Website), the approach, the expected mechanism, and what NOT to do.
- Respect the store's money: don't recommend exploration that cuts something working.`;

const KEYLESS_NOTE = `\n\nYour reply has a hard limit of about 1,000 words including thinking. Keep every field short (under 40 words). Return only the JSON asked for.`;

function context(data: string, engine: EngineResult, a: Analysis) {
  const d = a.dashboard;
  return [
    "<engine_output>", engineForPrompt(engine), "</engine_output>",
    "<findings>",
    `Root cause: ${d.root_cause}`,
    ...d.layers.map((l) => `${l.layer}: ${l.status}: ${l.finding}`),
    `Actions already proposed: ${d.actions.map((x) => x.action).join("; ")}`,
    `Data gaps: ${d.data_gaps.join("; ") || "none"}`,
    "</findings>",
    `<seller_data>\n${data}\n</seller_data>`,
  ].join("\n");
}

export async function generateReportContent(data: string, engine: EngineResult, analysis: Analysis): Promise<ReportContent> {
  const ctx = context(data, engine, analysis);
  if (!KEYLESS) {
    return generateJSON({
      model: AI.models.analyze,
      maxTokens: 24000,
      system: SYSTEM,
      schema: ReportContent,
      user: `${ctx}\n\nWrite the full report content: diagnosis (bottom_line of 3–5 sentences, why = 3–5 causal claims with evidence, working, bounds), strategy (objective, up to 3 strategies, not_doing, cycles), and action plan (4–7 actions, sequencing, checklist).`,
    });
  }
  // Keyless: three small calls to fit the free tier's reply cap.
  const diag = await generateJSON({
    model: AI.models.analyze, maxTokens: 1500, system: SYSTEM + KEYLESS_NOTE, schema: Diagnose,
    user: `${ctx}\n\nReturn ONLY: bottom_line (3 sentences), why (3 claims with short evidence), working (1–2 sentences), bounds (2–3 caveats).`,
  });
  const strat = await generateJSON({
    model: AI.models.analyze, maxTokens: 1500, system: SYSTEM + KEYLESS_NOTE, schema: Strategy,
    user: `${ctx}\n\nDiagnosis bottom line: ${diag.bottom_line}\n\nReturn ONLY: objective (2 sentences), strategies (2–3, each with up to 3 short actions), not_doing (2 items), cycles (2–3 lines).`,
  });
  const act = await generateJSON({
    model: AI.models.analyze, maxTokens: 1500, system: SYSTEM + KEYLESS_NOTE, schema: Actions,
    user: `${ctx}\n\nStrategies: ${strat.strategies.map((s, i) => `${i + 1}. ${s.title}`).join(" | ")}\n\nReturn ONLY: actions (4–5, each field one short sentence, strategy = its strategy number), sequencing (3 lines), checklist (4–6 items).`,
  });
  return { ...diag, ...strat, ...act };
}

// ---------- HTML ----------

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const inr = (n: number | null | undefined) => (n == null ? "—" : `₹${Math.round(n).toLocaleString("en-IN")}`);
const lakh = (n: number) => (Math.abs(n) >= 100000 ? `₹${(n / 100000).toFixed(2)}L` : inr(n));

const CSS = `:root{--ink:#1a1d21;--muted:#5c6670;--line:#e3e7ec;--panel:#f7f9fb;--accent:#5b3fd6;--accent-soft:#efebff;--warn:#8a5a00;--red:#b3261e;--green:#0a6638}
*{box-sizing:border-box}body{margin:0;background:#fff;color:var(--ink);font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:1060px;margin:0 auto;padding:32px 24px 96px}
header.top{border-bottom:2px solid var(--ink);padding-bottom:20px;margin-bottom:22px}
.kicker{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);font-weight:700;margin-bottom:6px}
header.top h1{font-size:28px;line-height:1.2;margin:0 0 6px}.sub{color:var(--muted);font-size:14px}
.config{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:6px 18px;margin:18px 0}
.config table{width:100%;border-collapse:collapse}.config th,.config td{border-bottom:1px solid var(--line);padding:8px 6px;text-align:left;font-size:14px}
.config tr:last-child th,.config tr:last-child td{border-bottom:0}.config th{color:var(--muted);font-weight:600;width:190px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:0 0 20px}
.kpi{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:11px 14px}
.kpi .l{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}.kpi .v{font-size:20px;font-weight:700;font-variant-numeric:tabular-nums}
.kpi.red .v{color:var(--red)}.kpi.amber .v{color:var(--warn)}.kpi.green{background:#f0fdf4;border-color:#86efac}.kpi.green .v{color:var(--green)}
.note{background:#fff7e6;border:1px solid #f0dca8;border-left:4px solid var(--warn);border-radius:10px;padding:11px 16px;margin:0 0 26px;font-size:14px;color:#5f4400}
nav.toc{position:sticky;top:0;z-index:5;background:rgba(255,255,255,.94);backdrop-filter:blur(6px);border:1px solid var(--line);border-radius:10px;padding:10px 14px;margin-bottom:30px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
nav.toc .lbl{font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)}
nav.toc a{text-decoration:none;color:var(--ink);font-weight:600;font-size:14px;padding:5px 12px;border-radius:999px;border:1px solid var(--line)}
nav.toc a:hover{border-color:var(--accent);color:var(--accent);background:var(--accent-soft)}
section.stage{margin:0 0 50px;scroll-margin-top:70px}.stage-head{display:flex;align-items:center;gap:10px;margin-bottom:4px}
.stage-head .num{font-size:13px;font-weight:800;color:#fff;background:var(--accent);border-radius:8px;padding:3px 9px}
.stage-head .t{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);font-weight:700}
h2.s{font-size:22px;margin:10px 0 6px;padding-bottom:8px;border-bottom:2px solid var(--ink)}
h3{font-size:17px;margin:28px 0 6px}h3::before{content:"";display:inline-block;width:4px;height:15px;background:var(--accent);border-radius:2px;margin-right:9px;vertical-align:-2px}
h4{font-size:15px;margin:22px 0 4px}p{margin:10px 0}ul,ol{margin:10px 0;padding-left:24px}li{margin:5px 0}
table.d{border-collapse:collapse;width:100%;margin:14px 0 18px;font-size:13.5px}
table.d th,table.d td{border:1px solid var(--line);padding:8px 10px;text-align:left;vertical-align:top}table.d th{background:var(--panel);font-weight:600}
.box{border:1px solid var(--line);border-radius:12px;padding:14px 18px;margin:14px 0;background:#fff}
.box .row{margin:6px 0;font-size:14.5px}.box .k{font-weight:700}
.tag{display:inline-block;font-size:11px;font-weight:700;border-radius:6px;padding:1px 7px;background:var(--accent-soft);color:var(--accent);margin-left:6px;vertical-align:2px}
.spark{display:flex;gap:4px;align-items:flex-end;height:70px;margin:12px 0 4px}.spark div{flex:1;border-radius:3px 3px 0 0;min-height:3px}
.spark-l{display:flex;gap:4px;font-size:10.5px;color:var(--muted)}.spark-l span{flex:1;text-align:center}
.foot{margin-top:40px;color:var(--muted);font-size:12.5px;border-top:1px solid var(--line);padding-top:14px}
@media print{nav.toc{display:none}}`;

const STATUS: Record<string, string> = { ruled_out: "✅ Ruled out", signal: "⚠️ Signal", flagged: "🔴 Flagged", not_available: "— Data needed" };

export function buildReportHtml(c: ReportContent, e: EngineResult, a: Analysis): string {
  const d = a.dashboard;
  const ok = e.ok;
  const metrics = ok ? e.metrics : [];
  const flagged = metrics.filter((m) => m.flagged);
  const totalCeiling = flagged.reduce((s, m) => s + (m.impact_inr ?? 0), 0);
  const lossWeek = ok ? e.loss_week : null;
  const bench = ok && e.benchmark ? e.benchmark : null;
  const title = `${esc(d.header.seller)} — Meta Troubleshoot, ${esc(d.header.loss_week)}`;
  const subtitle = ok
    ? `${flagged.map((m) => `${m.metric.replace("%", "")} ${m.loss_week}% (${m.delta_pp > 0 ? "+" : ""}${m.delta_pp}pp vs benchmark)`).join(" + ") || "No metric over threshold"} · ${lossWeek!.np}% weekly net profit · ${flagged.map((m) => `${inr(m.inr_per_pp)}/pp ${m.metric.replace("%", "")}`).join(" · ")}`
    : "Engine could not parse the PnL; figures below are unverified.";

  const kpis: string[] = [];
  if (ok) {
    kpis.push(`<div class="kpi ${lossWeek!.np < 0 ? "red" : "green"}"><div class="l">Weekly net profit</div><div class="v">${lossWeek!.np}%</div></div>`);
    kpis.push(`<div class="kpi"><div class="l">Loss-week GMV</div><div class="v">${lakh(lossWeek!.gmv)}</div></div>`);
    for (const m of metrics.slice(0, 4)) {
      kpis.push(`<div class="kpi ${m.flagged ? "red" : m.delta_pp > 0 ? "amber" : ""}"><div class="l">${esc(m.metric)} (Δ ${m.delta_pp > 0 ? "+" : ""}${m.delta_pp}pp)</div><div class="v">${m.loss_week}%</div></div>`);
    }
    for (const m of flagged.slice(0, 2)) kpis.push(`<div class="kpi amber"><div class="l">₹ per pp ${esc(m.metric.replace("%", ""))}</div><div class="v">${inr(m.inr_per_pp)}</div></div>`);
  }

  // Profit history bars
  let history = "";
  if (ok && e.history.recent.length > 1) {
    const max = Math.max(...e.history.recent.map((w) => Math.abs(w.np)), 1);
    history = `<div class="spark">${e.history.recent.map((w) => `<div title="${esc(w.label)}: ${w.np}%" style="height:${Math.max(4, (Math.abs(w.np) / max) * 100)}%;background:${w.np >= 0 ? "#10b981" : "#ef4444"}"></div>`).join("")}</div><div class="spark-l">${e.history.recent.map((w) => `<span>${esc(w.label.split(" ")[0])}</span>`).join("")}</div>`;
  }
  const everWorked = ok
    ? e.history.last_profitable
      ? `<p><b>Existed and was lost.</b> The last profitable week was <b>${esc(e.history.last_profitable)}</b>. ${esc(lossWeek!.label)} is loss week ${e.history.loss_streak} in a row${e.history.loss_streak > 1 ? "" : " (first loss)"}. Benchmark used: ${esc(bench?.weeks.join(", ") ?? "none")} (${esc(bench?.quality ?? "—")}, ${esc(bench?.method ?? "")}).</p>`
      : `<p><b>Never profitable in the data provided.</b> Comparisons are directional.</p>`
    : "";

  const standRows = metrics.map((m) => `<tr><td><b>${esc(m.metric)}</b></td><td>${m.benchmark}%</td><td>${m.loss_week}%</td><td>${m.flagged ? "🔴" : m.delta_pp > 0 ? "⚠️" : "✅"} ${m.delta_pp > 0 ? "+" : ""}${m.delta_pp}pp (threshold +${m.threshold_pp}pp)</td><td>${m.impact_inr ? `${inr(m.impact_inr)}/wk · ${inr(m.inr_per_pp)} per 1pp` : "—"}</td></tr>`).join("");

  const sizingRows = metrics.map((m) => `<tr><td><b>${esc(m.metric)}</b></td><td>${m.loss_week}%</td><td>${m.benchmark}%</td><td>${m.delta_pp > 0 ? `+${m.delta_pp}` : "clear"}</td><td>${m.delta_pp > 0 ? inr(m.inr_per_pp) : "—"}</td><td>${m.delta_pp > 0 ? `${inr(m.impact_inr)}/wk` : "—"}</td></tr>`).join("");

  const actionBoxes = c.actions.map((x, i) => `<div class="box"><h4 style="margin-top:2px">Action ${i + 1} — ${esc(x.title)}${x.strategy ? `<span class="tag">Strategy ${x.strategy}</span>` : ""}</h4>
<div class="row"><span class="k">Evidence:</span> ${esc(x.evidence)}</div>
<div class="row"><span class="k">Lever:</span> ${esc(x.lever)}</div>
<div class="row"><span class="k">Approach:</span> ${esc(x.approach)}</div>
<div class="row"><span class="k">Expected mechanism:</span> ${esc(x.expected)}</div>
<div class="row"><span class="k">What NOT to do:</span> ${esc(x.avoid)}</div></div>`).join("");

  const stratBlocks = c.strategies.map((s, i) => `<h3>Strategy ${i + 1} — ${esc(s.title)}</h3>
<p><b>Goal:</b> ${esc(s.goal)}</p><p><b>Mechanism:</b> ${esc(s.mechanism)}</p>
<p><b>Actions</b></p><ul>${s.actions.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
<p><b>Measuring:</b> ${esc(s.measuring)}</p>`).join("");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><style>${CSS}</style></head><body><div class="wrap">
<header class="top"><div class="kicker">LossLens troubleshoot · Diagnose → Strategy → Action · ${esc(d.header.loss_week)}</div>
<h1>${title}</h1><div class="sub">${esc(subtitle)}</div></header>
<div class="config"><table>
<tr><th>Store</th><td>${esc(d.header.seller)}</td></tr>
<tr><th>Channel</th><td>Meta (Facebook + Instagram)</td></tr>
<tr><th>Loss week</th><td>${esc(d.header.loss_week)}</td></tr>
<tr><th>Benchmark</th><td>${esc(bench ? `${bench.weeks.join(", ")} · ${bench.quality} · ${bench.method} · spend diff ${bench.spend_diff_pct}%` : d.header.benchmark)}</td></tr>
<tr><th>Primary lens</th><td>${esc(d.header.primary_lens)}${ok && e.downstream_sgmv ? " (S/GMV downstream)" : ""}</td></tr>
<tr><th>Generated by</th><td>LossLens · engine-verified numbers · AI: ${esc(AI.label)}</td></tr>
</table></div>
<div class="kpis">${kpis.join("")}</div>
${bench?.warnings.length || c.bounds.length ? `<div class="note"><b>Read this first:</b> ${esc([...(bench?.warnings ?? []), ...c.bounds.slice(0, 1)].join(" "))}</div>` : ""}
<nav class="toc"><span class="lbl">Jump to</span><a href="#diagnose">① Diagnose</a><a href="#strategy">② Strategy</a><a href="#action">③ Action plan</a></nav>

<section class="stage" id="diagnose"><div class="stage-head"><span class="num">STAGE 1</span><span class="t">Diagnose</span></div>
<h2 class="s">${esc(d.header.seller)} — account state, ${esc(d.header.loss_week)}</h2>
<h3>Bottom line</h3><p>${esc(c.bottom_line)}</p>
<h3>Where the account stands</h3>
<table class="d"><tr><th>Metric</th><th>Benchmark</th><th>This week</th><th>Verdict</th><th>₹ at stake</th></tr>${standRows}</table>
<h3>Has this ever worked</h3>${everWorked}${history}
<h3>Why the account is in this state</h3>${c.why.map((w) => `<p><b>${esc(w.claim)}</b> ${esc(w.evidence)}</p>`).join("")}
<p><b>Root cause:</b> ${esc(d.root_cause)}</p>
<h3>What is working</h3><p>${esc(c.working)}</p>
<h3>What else was checked</h3><ul>${d.layers.map((l) => `<li><b>${esc(l.layer)}</b> — ${STATUS[l.status] ?? esc(l.status)}: ${esc(l.finding)}</li>`).join("")}</ul>
<h3>What bounds this</h3><ul>${c.bounds.map((b) => `<li>${esc(b)}</li>`).join("")}${d.data_gaps.map((g) => `<li>Not checked: ${esc(g)}</li>`).join("")}</ul>
</section>

<section class="stage" id="strategy"><div class="stage-head"><span class="num">STAGE 2</span><span class="t">Strategy</span></div>
<h2 class="s">${esc(d.header.seller)} — strategy</h2>
<h3>Objective</h3><p>${esc(c.objective)}</p>
${stratBlocks}
<h3>Not doing, and why</h3><ul>${c.not_doing.map((n) => `<li><b>${esc(n.item)}</b> — ${esc(n.reason)}</li>`).join("")}</ul>
<h3>Cycles</h3><ul>${c.cycles.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
</section>

<section class="stage" id="action"><div class="stage-head"><span class="num">STAGE 3</span><span class="t">Action plan</span></div>
<h2 class="s">${esc(d.header.seller)} — action plan, ${esc(d.header.loss_week)}</h2>
<h3>Recovery sizing (ceilings, not forecasts)</h3>
<table class="d"><tr><th>Lever</th><th>This week</th><th>Benchmark</th><th>Gap (pp)</th><th>₹ per 1pp</th><th>₹ for full return</th></tr>${sizingRows}</table>
${ok ? `<p><b>Total ceiling:</b> ${inr(totalCeiling)}/week of profit if every flagged lever returns to benchmark. ${esc(d.recovery_target)}</p>` : ""}
<h3>Recommended actions</h3>${actionBoxes}
<h3>Sequencing</h3><ol>${c.sequencing.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>
<h3>Final operator checklist</h3><ul>${c.checklist.map((x) => `<li>☐ ${esc(x)}</li>`).join("")}</ul>
</section>
<div class="foot">Generated by LossLens (built by S Surya Narayan). Steps 1–2 figures are computed in code from the uploaded PnL; narrative and recommendations are AI-written. Verify before acting.</div>
</div></body></html>`;
}
