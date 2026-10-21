"use client";

import { useEffect, useState } from "react";
import { SITE } from "@/lib/site";

const WORDS = ["RTO spikes", "ad spend leaks", "COGS creep", "cancel surges", "silent RTO", "dead campaigns"];

// Replay of the engine on the "Women Only" sample case.
const LOG: { tag: string; text: string; tone?: string }[] = [
  { tag: "$", text: "losslens run --store demo-ethnic-co", tone: "var(--ink)" },
  { tag: "intake", text: "10 PnL weeks · 8 data sources · 0 required missing" },
  { tag: "engine", text: "benchmark W33–W36 · 6-mo · ±10% band · profitable · n=4" },
  { tag: "engine", text: "RTO% 30.83 → 48.2 (+17.37pp) FLAGGED · ₹77,957", tone: "var(--loss)" },
  { tag: "engine", text: "S/GMV +2.4pp · downstream of RTO", tone: "var(--warn)" },
  { tag: "reason", text: "fulfilment O2S 1.3d · S2A 3.9d · FAD 59% → ruled out" },
  { tag: "reason", text: "audience male spend share 6% → 39%", tone: "var(--loss)" },
  { tag: "reason", text: "campaign 'Women_Only' delivered 64% to men" },
  { tag: "verify", text: "numbers traced to PnL ✓ · benchmark valid ✓", tone: "var(--good)" },
  { tag: "result", text: "ROOT CAUSE → Campaign × Gender", tone: "var(--cyan)" },
];

const TAG_COLOR: Record<string, string> = {
  $: "var(--cyan)", intake: "var(--violet)", engine: "var(--cyan)", reason: "var(--pink)", verify: "var(--good)", result: "var(--cyan)",
};

function Terminal() {
  const [shown, setShown] = useState(0);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (shown >= LOG.length) {
      const t = setTimeout(() => { setShown(0); setTyped(""); }, 3800);
      return () => clearTimeout(t);
    }
    const full = LOG[shown].text;
    if (typed.length < full.length) {
      const t = setTimeout(() => setTyped(full.slice(0, typed.length + 2)), 14);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => { setShown((s) => s + 1); setTyped(""); }, 380);
    return () => clearTimeout(t);
  }, [shown, typed]);

  return (
    <div className="term card hud glow-border relative overflow-hidden text-left">
      <div className="flex items-center justify-between border-b px-4 py-2.5" style={{ borderColor: "var(--line)" }}>
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--loss)" }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--warn)" }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--good)" }} />
        </div>
        <span className="label muted">agent://losslens · demo replay</span>
      </div>
      <div className="mono min-h-[300px] space-y-1.5 p-4 text-[12px] leading-relaxed sm:text-[13px]">
        {LOG.slice(0, shown).map((l, i) => (
          <div key={i} className="flex gap-3">
            <span className="w-14 shrink-0 text-right" style={{ color: TAG_COLOR[l.tag] }}>{l.tag}</span>
            <span style={{ color: l.tone ?? "var(--ink-soft)" }}>{l.text}</span>
          </div>
        ))}
        {shown < LOG.length && (
          <div className="flex gap-3">
            <span className="w-14 shrink-0 text-right" style={{ color: TAG_COLOR[LOG[shown].tag] }}>{LOG[shown].tag}</span>
            <span className="caret" style={{ color: LOG[shown].tone ?? "var(--ink-soft)" }}>{typed}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Hero() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % WORDS.length), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28">
      <div className="grid-bg absolute inset-0 -z-10" />
      <div className="floor -z-10" />
      <div className="orb -z-10" style={{ width: 480, height: 480, left: "-10%", top: "-12%", background: "var(--cyan)" }} />
      <div className="orb -z-10" style={{ width: 440, height: 440, right: "-8%", top: "5%", background: "var(--violet)", animationDelay: "-6s" }} />
      <div className="orb -z-10" style={{ width: 300, height: 300, left: "40%", top: "40%", background: "var(--pink)", opacity: 0.22, animationDelay: "-12s" }} />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-[1.05fr_1fr]">
        <div className="text-center lg:text-left">
          <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border px-3 py-1" style={{ borderColor: "color-mix(in srgb, var(--cyan) 35%, transparent)", background: "color-mix(in srgb, var(--cyan) 6%, transparent)" }}>
            <span className="pulse-dot h-2 w-2 rounded-full" style={{ background: "var(--cyan)" }} />
            <span className="label" style={{ color: "var(--accent-ink)" }}>Agent online · e-commerce & Shopify</span>
          </div>

          <h1 className="font-display animate-fade-up mt-6 text-5xl font-bold leading-[1.0] sm:text-6xl lg:text-7xl" style={{ animationDelay: "80ms" }}>
            Profit forensics,
            <br />
            <span className="gradient-text">on autopilot.</span>
          </h1>

          <p className="animate-fade-up mt-5 text-lg" style={{ animationDelay: "140ms" }}>
            <span className="muted">Now hunting: </span>
            <span className="relative inline-block min-w-[9ch] text-left">
              <span key={i} className="animate-word mono font-semibold" style={{ color: "var(--cyan)" }}>{WORDS[i]}</span>
            </span>
          </p>

          <p className="animate-fade-up mx-auto mt-5 max-w-xl text-base muted sm:text-lg lg:mx-0" style={{ animationDelay: "200ms" }}>
            <strong className="text-ink">LossLens</strong> is an AI agent that finds why your store lost money.
            Drop in your exports: a <span className="text-ink">deterministic engine</span> computes the numbers,
            an <span className="text-ink">AI analyst</span> reasons through 8 steps, and a{" "}
            <span className="text-ink">verifier</span> catches anything it can&apos;t trace. Out comes the exact root cause and a ₹ fix plan.
          </p>

          <div className="animate-fade-up mt-9 flex flex-wrap justify-center gap-3 lg:justify-start" style={{ animationDelay: "260ms" }}>
            <a href="#try" className="btn-primary rounded-xl px-6 py-3 text-sm">Launch the agent →</a>
            <a href="#cases" className="btn-ghost rounded-xl px-6 py-3 text-sm font-semibold">Replay a sample case</a>
          </div>

          <p className="animate-fade-up mt-8 text-xs muted" style={{ animationDelay: "320ms" }}>
            Designed & engineered by{" "}
            <a href={SITE.linkedin} target="_blank" rel="noreferrer" className="text-ink underline decoration-2 underline-offset-4">
              {SITE.authorName}
            </a>
          </p>
        </div>

        <div className="animate-fade-up" style={{ animationDelay: "200ms" }}>
          <Terminal />
        </div>
      </div>
    </section>
  );
}
