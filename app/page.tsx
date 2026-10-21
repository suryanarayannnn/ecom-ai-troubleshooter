"use client";

import { useMemo, useState } from "react";
import type { Analysis } from "@/lib/schema";
import {
  CASES, CATEGORIES, CHANGE_OPTIONS, DATA_SIGNALS, LENSES, buildPayload,
  type Answers, type DemoCase,
} from "@/lib/cases";
import { SITE } from "@/lib/site";
import Hero from "@/components/Hero";
import Reveal from "@/components/Reveal";
import Progress, { STEP_LIST } from "@/components/Progress";
import Faq from "@/components/Faq";
import Dashboard from "@/components/Dashboard";
import Report from "@/components/Report";

const EMPTY: Answers = { seller: "", category: "", lossWeek: "", suspect: "Not sure", changes: [], notes: "" };

const TICKER = [
  "Campaign × Gender", "Campaign × Product saturation", "Campaign × Geo", "Catalogue contraction",
  "Carrier failure × RTO", "Cost-price COGS spike", "Workhorse defunding", "Geo-exclusion bypass",
  "ROAS floor removed", "OOS-forced migration",
];

function SectionHead({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--loss)" }}>{kicker}</p>
      <h2 className="font-display mt-3 text-3xl font-bold sm:text-4xl">{title}</h2>
      {sub && <p className="mt-3 muted">{sub}</p>}
    </Reveal>
  );
}

function Q({ n, label, hint, children }: { n: number; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-baseline gap-2 text-sm font-medium">
        <span className="font-mono text-xs" style={{ color: "var(--loss)" }}>{String(n).padStart(2, "0")}</span>
        {label}
      </label>
      {hint && <p className="mt-0.5 pl-7 text-xs muted">{hint}</p>}
      <div className="mt-2.5 pl-7">{children}</div>
    </div>
  );
}

export default function Home() {
  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const [data, setData] = useState("");
  const [activeCase, setActiveCase] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Analysis | null>(null);

  const detected = useMemo(() => DATA_SIGNALS.filter((s) => s.re.test(data)).map((s) => s.label), [data]);
  const set = <K extends keyof Answers>(k: K, v: Answers[K]) => setAnswers((a) => ({ ...a, [k]: v }));
  const toggleChange = (c: string) =>
    set("changes", answers.changes.includes(c) ? answers.changes.filter((x) => x !== c) : [...answers.changes, c]);

  function loadCase(c: DemoCase) {
    setActiveCase(c.id);
    setAnswers(c.answers);
    setData(c.data);
    setResult(null);
    setError(null);
    document.getElementById("try")?.scrollIntoView({ behavior: "smooth" });
  }

  function reset() {
    setActiveCase(null);
    setAnswers(EMPTY);
    setData("");
    setResult(null);
    setError(null);
  }

  async function analyze() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: buildPayload(answers, data) }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
      setResult(json as Analysis);
      setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }), 80);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      {/* Nav */}
      <nav className="fixed inset-x-0 top-0 z-50 border-b backdrop-blur-xl" style={{ borderColor: "var(--line)", background: "rgba(7,8,13,.6)" }}>
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <a href="#" className="font-display flex items-center gap-2 font-bold">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg text-xs" style={{ background: "linear-gradient(135deg,#ff6b4a,#8b6cff)" }}>◎</span>
            <span>Loss<span className="gradient-text">Lens</span></span>
          </a>
          <div className="flex items-center gap-1 text-sm sm:gap-5">
            <a href="#how" className="hidden muted hover:text-white sm:inline">How it works</a>
            <a href="#cases" className="hidden muted hover:text-white sm:inline">Cases</a>
            <a href="#faq" className="hidden muted hover:text-white sm:inline">FAQ</a>
            <a href={SITE.linkedin} target="_blank" rel="noreferrer" className="btn-ghost rounded-lg px-3 py-1.5 text-xs font-medium">
              {SITE.authorName} ↗
            </a>
          </div>
        </div>
      </nav>

      <Hero />

      {/* Ticker */}
      <div className="border-y py-4" style={{ borderColor: "var(--line)", background: "var(--bg-2)" }}>
        <div className="overflow-hidden" style={{ maskImage: "linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent)" }}>
          <div className="marquee-track gap-10">
            {[...TICKER, ...TICKER].map((t, i) => (
              <span key={i} className="flex items-center gap-3 whitespace-nowrap text-sm muted">
                <span style={{ color: "var(--loss)" }}>◆</span> {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24">
        <SectionHead
          kicker="The method"
          title="Eight steps. No skipped checks."
          sub="The same framework a senior growth analyst uses. It is codified so the conclusion is the same no matter who runs it."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEP_LIST.map((s, i) => (
            <Reveal key={s.t} delay={i * 70}>
              <div className="card lift h-full p-5">
                <div className="font-display text-4xl font-bold" style={{ color: "rgba(255,255,255,.12)" }}>{String(i + 1).padStart(2, "0")}</div>
                <p className="mt-3 font-semibold">{s.t}</p>
                <p className="mt-1.5 text-sm leading-relaxed muted">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Cases */}
      <section id="cases" className="scroll-mt-20 border-y py-24" style={{ borderColor: "var(--line)", background: "var(--bg-2)" }}>
        <div className="mx-auto max-w-6xl px-4">
          <SectionHead
            kicker="Try it in one click"
            title="Four sellers. Four different failures."
            sub="Each fictional seller is built so the obvious guess is wrong. Pick one, and the questions and data fill in for you."
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {CASES.map((c, i) => (
              <Reveal key={c.id} delay={i * 90}>
                <button
                  type="button"
                  onClick={() => loadCase(c)}
                  className={`card lift group relative h-full w-full overflow-hidden p-6 text-left ${activeCase === c.id ? "glow-border" : ""}`}
                >
                  <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-25 blur-3xl transition-opacity group-hover:opacity-50" style={{ background: c.accent }} />
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: `${c.accent}22`, color: c.accent }}>
                      Lens: {c.lens}
                    </span>
                    <span className="text-xs muted">{c.answers.category}</span>
                  </div>
                  <p className="font-display mt-4 text-xl font-semibold">{c.title}</p>
                  <p className="mt-2 text-sm muted">{c.hook}</p>
                  <div className="mt-5 flex items-center justify-between text-xs">
                    <span className="muted">Hidden pattern: <span className="blur-[3px] transition group-hover:blur-0 text-white">{c.pattern}</span></span>
                    <span className="font-semibold transition-transform group-hover:translate-x-1" style={{ color: c.accent }}>Load case →</span>
                  </div>
                </button>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Intake */}
      <section id="try" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24">
        <SectionHead
          kicker="Run a diagnosis"
          title="Tell me about the bad week."
          sub="Four quick questions give the analyst context. Then paste whatever data you have."
        />

        <Reveal className="mt-12">
          <div className="card glow-border p-5 sm:p-8">
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Questions */}
              <div className="space-y-7">
                <Q n={1} label="Which seller, and what do they sell?">
                  <input className="field w-full px-3.5 py-2.5 text-sm" placeholder="Brand name" value={answers.seller} onChange={(e) => set("seller", e.target.value)} />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {CATEGORIES.map((c) => (
                      <button key={c} type="button" data-on={answers.category === c} onClick={() => set("category", answers.category === c ? "" : c)} className="chip px-3 py-1.5 text-xs">{c}</button>
                    ))}
                  </div>
                </Q>
                <Q n={2} label="Which week lost money?" hint="Leave blank to diagnose the most recent loss week.">
                  <input className="field w-full px-3.5 py-2.5 text-sm" placeholder="e.g. W40 2026" value={answers.lossWeek} onChange={(e) => set("lossWeek", e.target.value)} />
                </Q>
                <Q n={3} label="What do you think is hurting most?" hint="It's a hypothesis. The analyst will verify it or overturn it.">
                  <div className="flex flex-wrap gap-2">
                    {LENSES.map((l) => (
                      <button key={l} type="button" data-on={answers.suspect === l} onClick={() => set("suspect", l)} className="chip px-3.5 py-1.5 text-xs font-medium">{l}</button>
                    ))}
                  </div>
                </Q>
                <Q n={4} label="What changed recently?" hint="Pick all that apply.">
                  <div className="flex flex-wrap gap-2">
                    {CHANGE_OPTIONS.map((c) => (
                      <button key={c} type="button" data-on={answers.changes.includes(c)} onClick={() => toggleChange(c)} className="chip px-3 py-1.5 text-xs">{c}</button>
                    ))}
                  </div>
                  <textarea className="field mt-3 h-20 w-full resize-none px-3.5 py-2.5 text-sm" placeholder="Anything else? (optional)" value={answers.notes} onChange={(e) => set("notes", e.target.value)} />
                </Q>
              </div>

              {/* Data */}
              <div className="flex flex-col">
                <div className="flex items-baseline justify-between gap-2">
                  <label className="flex items-baseline gap-2 text-sm font-medium">
                    <span className="font-mono text-xs" style={{ color: "var(--loss)" }}>05</span>
                    Paste your data
                  </label>
                  <span className="font-mono text-[11px] muted">{data.length.toLocaleString()} / 60,000</span>
                </div>
                <p className="mt-0.5 pl-7 text-xs muted">CSV rows, tables or notes. Weekly PnL is required. Everything else sharpens the result.</p>
                <textarea
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  placeholder={"=== SELLER PnL (weekly) ===\nWeek,Spend,GMV,RTO%,Spend/GMV%,COGS%,Cancel%,Net Profit%\nW38 2026,119000,588000,38.9,20.2,31.3,4.9,-0.8\n...\n\n=== CAMPAIGN PnL ===\n..."}
                  className="field mt-3 min-h-72 w-full flex-1 resize-y p-3.5 font-mono text-xs leading-relaxed"
                />
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {DATA_SIGNALS.map((s) => {
                    const on = detected.includes(s.label);
                    return (
                      <span key={s.label} className="rounded-md px-2 py-1 text-[11px] transition-all" style={{ background: on ? "rgba(74,222,128,.12)" : "rgba(255,255,255,.03)", color: on ? "var(--good)" : "#5d6476", border: `1px solid ${on ? "rgba(74,222,128,.35)" : "var(--line)"}` }}>
                        {on ? "✓ " : ""}{s.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t pt-6" style={{ borderColor: "var(--line)" }}>
              <div className="text-xs muted">
                {detected.length === 0 ? "No data detected yet. Paste data or load a sample case." : `${detected.length} data block${detected.length > 1 ? "s" : ""} detected. Missing ones will be listed as gaps.`}
              </div>
              <div className="flex gap-3">
                {(data || answers.seller) && (
                  <button type="button" onClick={reset} className="btn-ghost rounded-xl px-4 py-2.5 text-sm">Reset</button>
                )}
                <button type="button" onClick={analyze} disabled={loading || data.trim().length < 50} className="btn-primary rounded-xl px-6 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40">
                  {loading ? "Troubleshooting…" : "Troubleshoot my store →"}
                </button>
              </div>
            </div>

            {error && (
              <p className="animate-fade-up mt-5 rounded-xl border p-3.5 text-sm" style={{ borderColor: "rgba(255,107,74,.5)", background: "rgba(255,107,74,.08)", color: "#ffb199" }}>
                {error}
              </p>
            )}
          </div>
        </Reveal>

        {loading && <Progress />}

        {result && (
          <div id="results" className="animate-fade-up mt-14 scroll-mt-20 space-y-8">
            <Dashboard d={result.dashboard} />
            <Report markdown={result.report_markdown} />
          </div>
        )}
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 border-t py-24" style={{ borderColor: "var(--line)", background: "var(--bg-2)" }}>
        <div className="mx-auto max-w-3xl px-4">
          <SectionHead kicker="Questions" title="Before you trust it" />
          <Reveal className="mt-10"><Faq /></Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-4 py-12" style={{ borderColor: "var(--line)" }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 text-center sm:flex-row sm:text-left">
          <div>
            <p className="font-display text-lg font-semibold">
              LossLens · built by <a href={SITE.linkedin} target="_blank" rel="noreferrer" className="gradient-text">{SITE.authorName}</a>
            </p>
            <p className="mt-1 text-xs muted">The troubleshooting framework is distilled from 12+ live seller case studies. Sample sellers are fictional.</p>
          </div>
          <div className="flex gap-3 text-sm">
            <a href={SITE.linkedin} target="_blank" rel="noreferrer" className="btn-ghost rounded-lg px-4 py-2">LinkedIn</a>
            <a href={SITE.repo} target="_blank" rel="noreferrer" className="btn-ghost rounded-lg px-4 py-2">Source</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
