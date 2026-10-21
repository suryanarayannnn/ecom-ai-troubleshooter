"use client";

import { useEffect, useState } from "react";

export const STEP_LIST = [
  { t: "Benchmark selection", d: "Searching ±10/20/30% spend bands for a qualifying profitable week" },
  { t: "Problem metric", d: "Comparing RTO, S/GMV, COGS and Cancel against thresholds; sizing ₹ impact" },
  { t: "Changelog correlation", d: "Matching price, cost, visibility and OOS changes to the flagged metric" },
  { t: "Fulfilment checks", d: "O2S, S2A, FAD, NDR, and silent-RTO signals" },
  { t: "Audience (GASP)", d: "Gender, age and platform shifts and their mechanical chunks" },
  { t: "Product mix", d: "Concentration, anchor SKUs, and the demand-saturation fingerprint" },
  { t: "State / geo", d: "Geo expansion vs within-state spikes in previously clean states" },
  { t: "Campaign cross-cut", d: "Workhorse defunding, targeting compliance, and Campaign × Dimension" },
];

// The API call is a single request, so this is a paced visual of the method,
// not live telemetry.
export default function Progress() {
  const [step, setStep] = useState(0);
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    const s = setInterval(() => setSecs((x) => x + 1), 1000);
    const p = setInterval(() => setStep((x) => Math.min(x + 1, STEP_LIST.length - 1)), 11000);
    return () => { clearInterval(s); clearInterval(p); };
  }, []);

  return (
    <div className="card glow-border animate-fade-up mt-8 p-5 sm:p-7">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="spin h-5 w-5 rounded-full border-2" style={{ borderColor: "var(--line-strong)", borderTopColor: "var(--loss)" }} />
          <p className="font-display text-lg font-semibold">LossLens is troubleshooting your store…</p>
        </div>
        <span className="font-mono text-xs muted">{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}</span>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,.06)" }}>
        <div
          className="scan-bar h-full rounded-full transition-all duration-1000"
          style={{ width: `${((step + 1) / STEP_LIST.length) * 92}%`, background: "linear-gradient(90deg,#ff6b4a,#8b6cff,#3dd6c6)" }}
        />
      </div>
      <ol className="mt-5 grid gap-2 sm:grid-cols-2">
        {STEP_LIST.map((s, i) => {
          const state = i < step ? "done" : i === step ? "active" : "todo";
          return (
            <li key={s.t} className="flex items-start gap-3 rounded-xl p-2.5 transition-colors" style={{ background: state === "active" ? "rgba(255,255,255,.05)" : "transparent", opacity: state === "todo" ? 0.4 : 1 }}>
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${state === "active" ? "pulse-dot" : ""}`}
                style={{ background: state === "done" ? "var(--good)" : state === "active" ? "var(--loss)" : "rgba(255,255,255,.08)", color: state === "todo" ? "var(--muted)" : "#0a0a0a" }}
              >
                {state === "done" ? "✓" : i + 1}
              </span>
              <div>
                <p className="text-sm font-medium">{s.t}</p>
                {state === "active" && <p className="mt-0.5 text-xs muted">{s.d}</p>}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-xs muted">Typically 1–3 minutes. Every number in the report is traced back to your data.</p>
    </div>
  );
}
