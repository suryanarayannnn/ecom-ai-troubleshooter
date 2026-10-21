"use client";

import { useEffect, useState } from "react";

export const STEP_LIST = [
  { t: "Benchmark selection", d: "Searching ±10/20/30% spend bands across 6-month, 12-month and full-history windows" },
  { t: "Problem metric", d: "Comparing RTO, S/GMV, COGS and Cancel against thresholds and sizing ₹ impact" },
  { t: "Changelog correlation", d: "Matching price, cost, visibility and OOS changes to the flagged metric" },
  { t: "Fulfilment checks", d: "O2S, S2A, FAD, NDR and silent-RTO signals" },
  { t: "Audience", d: "Gender, age and platform shifts, with mechanical chunks" },
  { t: "Product mix", d: "Concentration, anchor SKUs and the demand-saturation fingerprint" },
  { t: "State / geo", d: "Geo expansion vs spikes in previously clean states" },
  { t: "Campaign cross-cut", d: "Workhorse defunding, targeting compliance, and campaign × dimension" },
];

// The request is a single call, so this console is a paced visual of the
// pipeline, not live telemetry.
const SCRIPT = [
  { at: 0, tag: "intake", text: "sources mapped · gaps declared" },
  { at: 2, tag: "engine", text: "parsing weekly PnL" },
  { at: 4, tag: "engine", text: "benchmark flowchart · window → band → tier → run" },
  { at: 6, tag: "engine", text: "deltas · thresholds · ₹ impact computed" },
  ...STEP_LIST.slice(2).map((s, i) => ({ at: 10 + i * 14, tag: "reason", text: `step ${i + 3} · ${s.t.toLowerCase()}` })),
  { at: 96, tag: "reason", text: "writing cross-cut root cause + action plan" },
  { at: 120, tag: "verify", text: "waiting on reasoning layer…" },
];
const TAG_COLOR: Record<string, string> = { intake: "#8b5cf6", engine: "#22d3ee", reason: "#f472b6", verify: "#a3e635" };

export default function Progress() {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const s = setInterval(() => setSecs((x) => x + 1), 1000);
    return () => clearInterval(s);
  }, []);

  const lines = SCRIPT.filter((l) => l.at <= secs);
  const stage = lines[lines.length - 1]?.tag ?? "intake";
  const stages = ["intake", "engine", "reason", "verify"];
  const pct = Math.min(94, 6 + secs * 0.75);

  return (
    <div className="card hud glow-border animate-fade-up mt-8 overflow-hidden" style={{ background: "rgba(5,7,14,.85)" }}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3" style={{ borderColor: "var(--line)" }}>
        <div className="flex items-center gap-3">
          <span className="spin h-4 w-4 rounded-full border-2" style={{ borderColor: "var(--line-strong)", borderTopColor: "var(--cyan)" }} />
          <span className="label" style={{ color: "#a5f3fc" }}>agent running</span>
        </div>
        <div className="flex gap-1.5">
          {stages.map((s) => (
            <span key={s} className="label rounded-md px-2 py-1" style={{
              background: s === stage ? `${TAG_COLOR[s]}22` : "transparent",
              color: s === stage ? TAG_COLOR[s] : stages.indexOf(s) < stages.indexOf(stage) ? "#6b7590" : "#3a4256",
              border: `1px solid ${s === stage ? `${TAG_COLOR[s]}66` : "var(--line)"}`,
            }}>{s}</span>
          ))}
        </div>
        <span className="mono text-xs muted">{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}</span>
      </div>
      <div className="h-1" style={{ background: "rgba(255,255,255,.04)" }}>
        <div className="scan-bar h-full transition-all duration-1000" style={{ width: `${pct}%`, background: "var(--grad)" }} />
      </div>
      <div className="mono max-h-72 space-y-1.5 overflow-y-auto p-5 text-[12px] sm:text-[13px]">
        {lines.map((l, i) => (
          <div key={i} className="animate-fade-up flex gap-3">
            <span className="w-14 shrink-0 text-right" style={{ color: TAG_COLOR[l.tag] }}>{l.tag}</span>
            <span className={i === lines.length - 1 ? "caret" : ""} style={{ color: i === lines.length - 1 ? "#eef2ff" : "#7d879e" }}>{l.text}</span>
          </div>
        ))}
      </div>
      <p className="border-t px-5 py-3 text-xs muted" style={{ borderColor: "var(--line)" }}>
        Usually 1–3 minutes. Core numbers are computed in code and verified before you see them.
      </p>
    </div>
  );
}
