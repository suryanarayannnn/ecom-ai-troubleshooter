// Deterministic calculation layer: benchmark search, metric deltas and ₹ impact
// are computed here in code, never by the language model.

export type Week = {
  label: string;
  date?: string;
  spend: number;
  gmv: number;
  rto: number;
  sgmv: number;
  cogs: number;
  cancel: number;
  np: number;
};

export type MetricRow = {
  metric: "RTO%" | "Spend/GMV%" | "COGS%" | "Cancel%";
  benchmark: number;
  loss_week: number;
  delta_pp: number;
  threshold_pp: number;
  flagged: boolean;
  impact_inr: number | null;
  pct_of_loss: number | null;
};

export type Benchmark = {
  weeks: string[];
  quality: "Profitable" | "Break-even" | "DIRECTIONAL";
  method: string;
  avg_spend: number;
  spend_diff_pct: number;
  warnings: string[];
};

export type EngineResult =
  | {
      ok: true;
      weeks_parsed: number;
      loss_week: Week;
      loss_amount_inr: number;
      benchmark: Benchmark | null;
      metrics: MetricRow[];
      primary: "RTO" | "S/GMV" | "COGS" | "Cancel" | "Unclear";
      downstream_sgmv: boolean;
      cogs_note: string | null;
      trace: string[];
    }
  | { ok: false; reason: string; trace: string[] };

// ---------- parsing ----------

function splitRow(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === delim && !q) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function num(s: string | undefined): number | null {
  if (s == null) return null;
  const t = s.replace(/[₹%,\s"]/g, "").replace(/^\((.*)\)$/, "-$1");
  if (t === "" || t === "-") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function parsePnl(text: string): Week[] | null {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/net\s*profit/i.test(line)) continue;
    const delim = line.includes("\t") ? "\t" : line.includes(",") ? "," : line.includes("|") ? "|" : null;
    if (!delim) continue;
    const h = splitRow(line, delim).map((x) => x.toLowerCase());
    const find = (pred: (x: string) => boolean) => h.findIndex(pred);
    const col = {
      week: Math.max(0, find((x) => /^(week|wk)/.test(x))),
      date: find((x) => /start|date/.test(x)),
      spend: find((x) => x.includes("spend") && !x.includes("gmv")),
      gmv: find((x) => x.includes("gmv") && !x.includes("spend") && !x.includes("/")),
      sgmv: find((x) => (x.includes("spend") && x.includes("gmv")) || x.includes("s/gmv")),
      rto: find((x) => x.includes("rto")),
      cogs: find((x) => x.includes("cogs")),
      cancel: find((x) => x.includes("cancel")),
      np: find((x) => x.includes("profit")),
    };
    if ([col.spend, col.gmv, col.sgmv, col.rto, col.cogs, col.cancel, col.np].some((c) => c < 0)) continue;

    const weeks: Week[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      const raw = lines[j].trim();
      if (!raw || raw.startsWith("===")) break;
      const r = splitRow(raw, delim);
      const w = {
        label: r[col.week] ?? `Row ${j}`,
        date: col.date >= 0 ? r[col.date] : undefined,
        spend: num(r[col.spend]), gmv: num(r[col.gmv]), sgmv: num(r[col.sgmv]), rto: num(r[col.rto]),
        cogs: num(r[col.cogs]), cancel: num(r[col.cancel]), np: num(r[col.np]),
      };
      if ([w.spend, w.gmv, w.sgmv, w.rto, w.cogs, w.cancel, w.np].some((v) => v == null)) continue;
      weeks.push(w as Week);
    }
    if (weeks.length < 2) continue;

    const dated = weeks.every((w) => w.date && !Number.isNaN(Date.parse(w.date)));
    if (dated) weeks.sort((a, b) => Date.parse(a.date!) - Date.parse(b.date!));
    return weeks;
  }
  return null;
}

// ---------- engine ----------

const METRICS = [
  { key: "rto", metric: "RTO%", lens: "RTO", threshold: 5, mult: 0.8 },
  { key: "sgmv", metric: "Spend/GMV%", lens: "S/GMV", threshold: 1, mult: 2.0 },
  { key: "cogs", metric: "COGS%", lens: "COGS", threshold: 3, mult: 1.0 },
  { key: "cancel", metric: "Cancel%", lens: "Cancel", threshold: 0.8, mult: 0.5 },
] as const;

const r2 = (n: number) => Math.round(n * 100) / 100;
const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function runEngine(text: string, requestedLossWeek?: string): EngineResult {
  const trace: string[] = [];
  const weeks = parsePnl(text);
  if (!weeks) {
    return { ok: false, reason: "No weekly PnL table with Spend, GMV, RTO%, Spend/GMV%, COGS%, Cancel% and Net Profit% columns was found.", trace };
  }
  trace.push(`intake: parsed ${weeks.length} PnL weeks (${weeks[0].label} → ${weeks[weeks.length - 1].label})`);

  // Loss week
  let lossIdx = -1;
  if (requestedLossWeek) {
    const want = norm(requestedLossWeek);
    lossIdx = weeks.findIndex((w) => norm(w.label) === want);
    if (lossIdx < 0) lossIdx = weeks.findIndex((w) => norm(w.label).startsWith(want) || want.startsWith(norm(w.label)));
    if (lossIdx >= 0) trace.push(`loss week: ${weeks[lossIdx].label} (as requested)`);
  }
  if (lossIdx < 0) {
    for (let i = weeks.length - 1; i >= 0; i--) if (weeks[i].np < 0) { lossIdx = i; break; }
    if (lossIdx < 0) return { ok: false, reason: "No week with Net Profit% below 0 was found in the PnL.", trace };
    trace.push(`loss week: ${weeks[lossIdx].label} (latest week with net profit < 0)`);
  }
  const loss = weeks[lossIdx];
  const lossAmount = Math.abs(Math.min(loss.np, 0)) / 100 * loss.gmv;

  // Benchmark flowchart: window → band → profitable before break-even → n=4..1 → most recent first
  const windows = [
    { name: "6-month", w: 26 },
    { name: "12-month", w: 52 },
    { name: "full-history", w: Number.POSITIVE_INFINITY },
  ];
  const bands = [10, 20, 30];
  const tiers = [
    { name: "Profitable" as const, ok: (np: number) => np > 5 },
    { name: "Break-even" as const, ok: (np: number) => np >= 3 && np <= 5 },
  ];
  let benchmark: Benchmark | null = null;
  let benchIdx: number[] = [];

  search: for (const win of windows) {
    const minStart = Math.max(0, lossIdx - win.w);
    for (const band of bands) {
      for (const tier of tiers) {
        for (const n of [4, 3, 2, 1]) {
          for (let end = lossIdx - 1; end - n + 1 >= minStart; end--) {
            const idx = Array.from({ length: n }, (_, k) => end - n + 1 + k);
            const run = idx.map((k) => weeks[k]);
            if (!run.every((w) => tier.ok(w.np))) continue;
            const s = avg(run.map((w) => w.spend));
            const diff = Math.abs(s - loss.spend) / loss.spend * 100;
            if (diff > band) continue;
            benchIdx = idx;
            benchmark = {
              weeks: run.map((w) => w.label),
              quality: tier.name,
              method: `${win.name} window · ±${band}% spend band · ${tier.name.toLowerCase()} · n=${n} consecutive`,
              avg_spend: Math.round(s),
              spend_diff_pct: r2(diff),
              warnings: [],
            };
            trace.push(`benchmark: ${benchmark.method} → ${run[0].label}${n > 1 ? `–${run[n - 1].label}` : ""} (spend diff ${r2(diff)}%)`);
            break search;
          }
        }
        trace.push(`benchmark: ${win.name} ±${band}% ${tier.name.toLowerCase()}: no qualifying run`);
      }
    }
  }

  if (!benchmark) {
    for (let i = lossIdx - 1; i >= 0; i--) {
      if (weeks[i].np > 5) {
        benchIdx = [i];
        const diff = Math.abs(weeks[i].spend - loss.spend) / loss.spend * 100;
        benchmark = {
          weeks: [weeks[i].label],
          quality: "DIRECTIONAL",
          method: "last resort: most recent profitable week at any spend",
          avg_spend: Math.round(weeks[i].spend),
          spend_diff_pct: r2(diff),
          warnings: ["No week qualified within ±30% spend. Comparisons are directional only."],
        };
        trace.push(`benchmark: fallback → ${weeks[i].label} (DIRECTIONAL)`);
        break;
      }
    }
  }
  if (!benchmark) {
    return { ok: false, reason: "No profitable (>5%) or break-even (3–5%) week exists before the loss week, so no benchmark can be set.", trace };
  }

  if (benchmark.spend_diff_pct > 59) benchmark.warnings.push("Benchmark spend is more than 59% away from the loss week, so treat it as directional.");
  if (lossIdx - benchIdx[benchIdx.length - 1] > 26) benchmark.warnings.push("Benchmark is more than 6 months old.");
  const qualifying = weeks.slice(0, lossIdx).filter((w) => w.np >= 3).length;
  if (qualifying === 1) benchmark.warnings.push("Only one qualifying week exists in the whole history. Caveat heavily.");

  // Metrics
  const bench = benchIdx.map((k) => weeks[k]);
  const metrics: MetricRow[] = METRICS.map((m) => {
    const b = r2(avg(bench.map((w) => w[m.key])));
    const l = loss[m.key];
    const d = r2(l - b);
    const impact = d > 0 ? Math.round(d * (m.mult / 100) * loss.gmv) : null;
    return {
      metric: m.metric,
      benchmark: b,
      loss_week: l,
      delta_pp: d,
      threshold_pp: m.threshold,
      flagged: d > m.threshold,
      impact_inr: impact,
      pct_of_loss: impact != null && lossAmount > 0 ? r2(impact / lossAmount * 100) : null,
    };
  });
  for (const m of metrics) {
    trace.push(`metric: ${m.metric} ${m.benchmark} → ${m.loss_week} (${m.delta_pp > 0 ? "+" : ""}${m.delta_pp}pp, threshold +${m.threshold_pp}pp) ${m.flagged ? "FLAGGED" : "ok"}${m.impact_inr ? ` · ₹${m.impact_inr.toLocaleString("en-IN")}` : ""}`);
  }

  const byLens = (lens: string) => metrics[METRICS.findIndex((m) => m.lens === lens)];
  const cogs = byLens("COGS");
  const cogsNote = cogs.delta_pp > 5 ? "COGS delta above 5pp: COGS-led case. Check the changelog for cost price changes vs product mix shift."
    : cogs.delta_pp >= 3 ? "COGS delta of 3–5pp: secondary signal." : null;

  const benchSpend = avg(bench.map((w) => w.spend));
  const benchGmv = avg(bench.map((w) => w.gmv));
  const downstream = byLens("S/GMV").flagged && loss.spend >= benchSpend * 0.97 && loss.gmv < benchGmv
    && (byLens("RTO").flagged || cogs.flagged);
  if (downstream) trace.push("rule: spend flat/up while GMV fell with RTO or COGS worse → S/GMV is downstream");

  const candidates = METRICS
    .map((m, i) => ({ lens: m.lens, row: metrics[i] }))
    .filter((c) => c.row.flagged && !(downstream && c.lens === "S/GMV"))
    .sort((a, b) => (b.row.impact_inr ?? 0) - (a.row.impact_inr ?? 0));
  const primary = candidates[0]?.lens ?? "Unclear";
  trace.push(`primary lens: ${primary}`);

  return {
    ok: true,
    weeks_parsed: weeks.length,
    loss_week: loss,
    loss_amount_inr: Math.round(lossAmount),
    benchmark,
    metrics,
    primary,
    downstream_sgmv: downstream,
    cogs_note: cogsNote,
    trace,
  };
}

export function engineForPrompt(e: EngineResult): string {
  if (!e.ok) return `Engine could not run: ${e.reason}\nState this in Step 1 and mark Step 2 numbers as unverifiable.`;
  const b = e.benchmark!;
  const rows = e.metrics.map((m) =>
    `| ${m.metric} | ${m.benchmark} | ${m.loss_week} | ${m.delta_pp > 0 ? "+" : ""}${m.delta_pp} | +${m.threshold_pp} | ${m.flagged ? "FLAGGED" : "—"} | ${m.impact_inr != null ? `₹${m.impact_inr.toLocaleString("en-IN")}` : "—"} | ${m.pct_of_loss != null ? `${m.pct_of_loss}%` : "—"} |`,
  ).join("\n");
  return [
    `Loss week: ${e.loss_week.label} · GMV ₹${e.loss_week.gmv.toLocaleString("en-IN")} · Spend ₹${e.loss_week.spend.toLocaleString("en-IN")} · Net profit ${e.loss_week.np}% (≈ ₹${e.loss_amount_inr.toLocaleString("en-IN")} loss)`,
    `Benchmark: ${b.weeks.join(", ")} · ${b.quality} · ${b.method} · avg spend ₹${b.avg_spend.toLocaleString("en-IN")} · spend diff ${b.spend_diff_pct}%`,
    b.warnings.length ? `Benchmark warnings: ${b.warnings.join(" ")}` : "",
    "",
    "| Metric | Benchmark | Loss week | Delta (pp) | Threshold | Flag | ₹ Impact | % of loss |",
    "|---|---|---|---|---|---|---|---|",
    rows,
    "",
    `Primary lens (by largest flagged ₹ impact): ${e.primary}${e.downstream_sgmv ? " (S/GMV is downstream of RTO/COGS)" : ""}`,
    e.cogs_note ?? "",
  ].filter((l) => l !== "").join("\n");
}
