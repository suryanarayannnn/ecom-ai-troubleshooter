"use client";

import { useEffect, useState } from "react";
import { SITE } from "@/lib/site";

const WORDS = ["RTO spikes", "S/GMV blowouts", "COGS creep", "cancel surges", "silent RTO"];

const STATS = [
  { value: 8, suffix: "", label: "diagnostic steps" },
  { value: 12, suffix: "+", label: "live case studies" },
  { value: 4, suffix: "", label: "problem lenses" },
  { value: 9, suffix: "", label: "failure modes guarded" },
];

function Counter({ to, suffix }: { to: number; suffix: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 1400);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{n}{suffix}</>;
}

export default function Hero() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % WORDS.length), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative overflow-hidden pt-28 pb-16 sm:pt-36 sm:pb-24">
      {/* Ornaments */}
      <div className="grid-bg absolute inset-0 -z-10" />
      <div className="orb -z-10" style={{ width: 460, height: 460, left: "-8%", top: "-10%", background: "#ff6b4a" }} />
      <div className="orb -z-10" style={{ width: 420, height: 420, right: "-6%", top: "10%", background: "#8b6cff", animationDelay: "-6s" }} />
      <div className="orb -z-10" style={{ width: 300, height: 300, left: "35%", bottom: "-20%", background: "#3dd6c6", opacity: 0.3, animationDelay: "-12s" }} />

      <div className="mx-auto max-w-6xl px-4 text-center">
        <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs" style={{ borderColor: "var(--line-strong)", background: "rgba(255,255,255,.04)" }}>
          <span className="pulse-dot h-2 w-2 rounded-full" style={{ background: "var(--loss)" }} />
          AI root-cause analyst for D2C Facebook sellers
        </div>

        <h1 className="font-display animate-fade-up mt-6 text-4xl font-bold leading-[1.05] sm:text-6xl md:text-7xl" style={{ animationDelay: "80ms" }}>
          Your week lost money.
          <br />
          <span className="muted">Find the </span>
          <span className="relative inline-block min-w-[6ch] align-bottom">
            <span key={i} className="animate-word gradient-text">{WORDS[i]}</span>
          </span>
          <span className="muted">.</span>
        </h1>

        <p className="animate-fade-up mx-auto mt-6 max-w-2xl text-base sm:text-lg muted" style={{ animationDelay: "160ms" }}>
          Answer a few questions, paste your PnL, campaign, audience, state and fulfilment data, and get a
          verified <strong className="text-white">L3 root cause</strong> (Campaign × Dimension) with a
          ₹-quantified action plan in minutes.
        </p>

        <div className="animate-fade-up mt-9 flex flex-wrap justify-center gap-3" style={{ animationDelay: "240ms" }}>
          <a href="#try" className="btn-primary rounded-xl px-6 py-3 text-sm font-semibold">Run a diagnosis →</a>
          <a href="#cases" className="btn-ghost rounded-xl px-6 py-3 text-sm font-semibold">Try a sample case</a>
        </div>

        <div className="animate-fade-up mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4" style={{ animationDelay: "320ms" }}>
          {STATS.map((s) => (
            <div key={s.label} className="card px-4 py-4">
              <div className="font-display text-3xl font-bold"><Counter to={s.value} suffix={s.suffix} /></div>
              <div className="mt-1 text-xs muted">{s.label}</div>
            </div>
          ))}
        </div>

        <p className="animate-fade-up mt-8 text-xs muted" style={{ animationDelay: "400ms" }}>
          Designed & built by{" "}
          <a href={SITE.linkedin} target="_blank" rel="noreferrer" className="text-white underline decoration-white/30 underline-offset-4 hover:decoration-white">
            {SITE.authorName}
          </a>
        </p>
      </div>
    </section>
  );
}
