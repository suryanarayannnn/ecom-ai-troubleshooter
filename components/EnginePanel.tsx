"use client";

import type { EngineResult } from "@/lib/engine";
import type { Check } from "@/lib/verify";
import type { Analysis } from "@/lib/schema";

const STATUS = {
  pass: { icon: "✓", color: "var(--good)", label: "pass" },
  fixed: { icon: "↻", color: "var(--cyan)", label: "auto-fixed" },
  warn: { icon: "!", color: "var(--warn)", label: "warning" },
  skip: { icon: "–", color: "var(--muted)", label: "skipped" },
} as const;

export default function EnginePanel({ engine, checks, analysis }: { engine: EngineResult; checks: Check[]; analysis: Analysis }) {
  const passed = checks.filter((c) => c.status === "pass" || c.status === "fixed").length;

  function downloadSidecar() {
    const d = analysis.dashboard;
    const sidecar = {
      generated_by: "LossLens",
      store: d.header.seller,
      loss_week: d.header.loss_week,
      benchmark: engine.ok ? engine.benchmark : d.header.benchmark,
      primary_lens: d.header.primary_lens,
      flags: d.metrics.filter((m) => m.flagged).map((m) => ({ metric: m.metric, delta_pp: m.delta_pp, impact_inr: m.impact_inr })),
      root_cause: d.root_cause,
      actions: d.actions,
      recovery_target: d.recovery_target,
      guardrails: checks,
      engine_trace: engine.trace,
    };
    const blob = new Blob([JSON.stringify(sidecar, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "losslens-sidecar.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card hud p-5 sm:p-6" style={{ background: "var(--panel)" }}>
        <div className="flex items-center justify-between gap-3">
          <p className="label" style={{ color: "var(--cyan)" }}>engine trace · deterministic</p>
          <button type="button" onClick={downloadSidecar} className="btn-ghost mono rounded-lg px-3 py-1.5 text-[11px]">
            ⤓ JSON sidecar
          </button>
        </div>
        {engine.ok ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border p-3" style={{ borderColor: "var(--line)" }}>
                <p className="label muted">benchmark</p>
                <p className="mt-1 font-semibold">{engine.benchmark!.weeks.length > 1 ? `${engine.benchmark!.weeks[0]} – ${engine.benchmark!.weeks.at(-1)}` : engine.benchmark!.weeks[0]}</p>
                <p className="text-xs muted">{engine.benchmark!.quality} · Δspend {engine.benchmark!.spend_diff_pct}%</p>
              </div>
              <div className="rounded-lg border p-3" style={{ borderColor: "var(--line)" }}>
                <p className="label muted">primary lens</p>
                <p className="mt-1 font-semibold" style={{ color: "var(--loss)" }}>{engine.primary}</p>
                <p className="text-xs muted">{engine.downstream_sgmv ? "S/GMV is downstream" : "largest flagged ₹ impact"}</p>
              </div>
            </div>
            <div className="term mono mt-4 max-h-56 space-y-1 overflow-y-auto rounded-lg p-3 text-[11.5px] leading-relaxed" style={{ background: "var(--well)" }}>
              {engine.trace.map((t, i) => (
                <div key={i} style={{ color: /FLAGGED|fallback|DIRECTIONAL/.test(t) ? "var(--loss-ink)" : /→ W|benchmark: .*n=/.test(t) && !/no qualifying/.test(t) ? "var(--accent-ink)" : "var(--muted)" }}>
                  <span style={{ color: "var(--dim)" }}>{String(i + 1).padStart(2, "0")} </span>{t}
                </div>
              ))}
            </div>
            {engine.benchmark!.warnings.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs" style={{ color: "var(--warn)" }}>
                {engine.benchmark!.warnings.map((w) => <li key={w}>⚠ {w}</li>)}
              </ul>
            )}
          </>
        ) : (
          <p className="mt-4 text-sm" style={{ color: "var(--warn)" }}>⚠ {engine.reason} Step 1–2 numbers come from the AI and are marked unverified.</p>
        )}
      </section>

      <section className="card hud p-5 sm:p-6" style={{ background: "var(--panel)" }}>
        <div className="flex items-center justify-between">
          <p className="label" style={{ color: "var(--good)" }}>verifier · guardrails</p>
          <span className="mono text-xs muted">{passed}/{checks.length} ok</span>
        </div>
        <ul className="mt-4 space-y-2.5">
          {checks.map((c) => {
            const s = STATUS[c.status];
            return (
              <li key={c.label} className="flex gap-3">
                <span className="mono mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-bold" style={{ background: `color-mix(in srgb, ${s.color} 18%, transparent)`, color: s.color }}>
                  {s.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{c.label} <span className="label ml-1" style={{ color: s.color, fontSize: 10 }}>{s.label}</span></p>
                  <p className="text-xs muted leading-relaxed">{c.detail}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
