import Reveal from "./Reveal";

const STAGES = [
  { k: "01", name: "Intake", tag: "files → sources", d: "Drop CSV exports or paste tables. Each source is recognised and mapped to the steps it unlocks. Gaps are declared up front.", color: "var(--violet)" },
  { k: "02", name: "Engine", tag: "code · deterministic", d: "Parses the PnL, runs the benchmark flowchart, and computes deltas, flags and ₹ impact. Same input, same numbers, every run.", color: "var(--cyan)" },
  { k: "03", name: "Reasoning", tag: "AI · 8 steps", d: "Works through changelog, fulfilment, audience, product, geo and campaigns, ruling each in or out with evidence.", color: "var(--pink)" },
  { k: "04", name: "Verifier", tag: "guardrails", d: "Re-checks every core figure against the engine, replaces anything untraceable, and flags weak conclusions.", color: "var(--good)" },
  { k: "05", name: "Report", tag: "dashboard + JSON", d: "A cross-cut root cause, a prioritised action plan with owners, the full case study, and a machine-readable sidecar.", color: "var(--warn)" },
];

export default function Pipeline() {
  return (
    <div className="mt-14 flex flex-col items-stretch lg:flex-row lg:items-center">
      {STAGES.map((s, i) => (
        <div key={s.k} className="contents">
          <Reveal delay={i * 110} className="lg:flex-1">
            <div className="card spot hud lift h-full p-5" style={{ ["--tint" as string]: s.color, borderTop: `3px solid ${s.color}`, background: `linear-gradient(180deg, color-mix(in srgb, ${s.color} 10%, transparent), transparent 55%), var(--card)` }}>
              <div className="flex items-center justify-between">
                <span className="mono text-xs" style={{ color: s.color }}>{s.k}</span>
                <span className="h-2 w-2 rounded-full pulse-dot" style={{ background: s.color }} />
              </div>
              <p className="font-display mt-3 text-xl font-semibold">{s.name}</p>
              <p className="label mt-1" style={{ color: s.color }}>{s.tag}</p>
              <p className="mt-3 text-sm leading-relaxed muted">{s.d}</p>
            </div>
          </Reveal>
          {i < STAGES.length - 1 && (
            <>
              <div className="beam hidden w-6 shrink-0 lg:block" />
              <div className="beam beam-v lg:hidden" />
            </>
          )}
        </div>
      ))}
    </div>
  );
}
