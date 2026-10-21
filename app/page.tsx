"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ChatWidget from "@/components/ChatWidget";
import Nav from "@/components/Nav";
import { FEATURES } from "@/lib/features";
import { PRICING, type PublicWallet } from "@/lib/pricing";
import { emitWallet } from "@/lib/useWallet";
import type { Analysis } from "@/lib/schema";
import type { EngineResult } from "@/lib/engine";
import type { Check } from "@/lib/verify";
import { CASES, CATEGORIES, CHANGE_OPTIONS, LENSES, buildPayload, type Answers, type DemoCase } from "@/lib/cases";
import { SOURCES, STEP_NAMES, detect, detectFileType } from "@/lib/intake";
import { SITE } from "@/lib/site";
import Hero from "@/components/Hero";
import Reveal from "@/components/Reveal";
import Pipeline from "@/components/Pipeline";
import Progress, { STEP_LIST } from "@/components/Progress";
import EnginePanel from "@/components/EnginePanel";
import Faq from "@/components/Faq";
import Dashboard from "@/components/Dashboard";
import Report from "@/components/Report";

type Result = { analysis: Analysis; engine: EngineResult; checks: Check[] };
type Upload = { name: string; size: number; kind: string; text: string };

const EMPTY: Answers = { seller: "", category: "", lossWeek: "", suspect: "Not sure", changes: [], notes: "" };
const MAX_CHARS = 60_000;

const TICKER = [
  "Campaign × Gender", "Campaign × Product saturation", "Campaign × Geo", "Catalogue contraction",
  "Carrier failure × RTO", "Cost-price COGS spike", "Workhorse defunding", "Geo-exclusion bypass",
  "ROAS floor removed", "OOS-forced migration", "Silent RTO", "Spend bloat",
];

const GUARDS = [
  { t: "GMV back-calculated from S/GMV", fix: "Every GMV figure must match a PnL cell. Mismatches are replaced.", live: true },
  { t: "Numbers the AI made up", fix: "All four core metrics are recomputed in code and swapped in if they differ.", live: true },
  { t: "Loss week used as a benchmark", fix: "The flowchart only accepts >5% profit or 3–5% break-even, inside the spend band.", live: true },
  { t: "Impact assigned to an improved metric", fix: "₹ impact is stripped from any metric that didn't worsen.", live: true },
  { t: "Wrong headline problem", fix: "The primary lens is checked against the largest flagged ₹ impact.", live: true },
  { t: "Single-factor 'root cause'", fix: "A root cause must cross two dimensions, or it gets downgraded.", live: true },
  { t: "Campaign RTO used as the account flag", fix: "The method compares account-level PnL RTO only. Campaign RTO is evidence.", live: false },
  { t: "Carrier failure mistaken for geo", fix: "Spikes in previously clean states trigger an FAD/NDR carrier review.", live: false },
  { t: "Demand saturation missed", fix: "Per-SKU spend growth vs order growth and CPO ratio are checked.", live: false },
];

const ROADMAP = [
  { when: "Live · v1", t: "Web agent", d: "Guided intake, deterministic engine, 8-step reasoning, verifier, dashboard and JSON sidecar.", on: true },
  ...(FEATURES.studio ? [{ when: "Live · beta", t: "Section Studio", d: "AI-generated Shopify sections with live preview, chat refinement and Liquid download.", on: true }] : []),
  { when: "Next", t: "Batch mode", d: "10 stores per run with a priority queue ranked by budget and loss depth." },
  { when: "Next", t: "Direct connectors", d: "Pull from Shopify, Meta Ads and courier APIs, with no manual exports." },
  { when: "Later", t: "Auto-routing", d: "Catalogue and logistics findings become tickets for the team that owns the fix." },
  { when: "Later", t: "Golden-set evals", d: "Every rule change must hold agreement on a library of solved cases before release." },
];

function SectionHead({ kicker, title, sub }: { kicker: string; title: React.ReactNode; sub?: string }) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <p className="label" style={{ color: "var(--cyan)" }}>{"// "}{kicker}</p>
      <h2 className="font-display mt-3 text-3xl font-bold sm:text-5xl">{title}</h2>
      {sub && <p className="mt-4 muted">{sub}</p>}
    </Reveal>
  );
}

function Q({ n, label, hint, children }: { n: number; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-baseline gap-2 text-sm font-medium">
        <span className="mono text-xs" style={{ color: "var(--cyan)" }}>{String(n).padStart(2, "0")}</span>
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
  const [files, setFiles] = useState<Upload[]>([]);
  const [over, setOver] = useState(false);
  const [activeCase, setActiveCase] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [noTokens, setNoTokens] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const combined = useMemo(
    () => [data.trim(), ...files.map((f) => `=== FILE: ${f.name} (detected: ${f.kind}) ===\n${f.text.trim()}`)].filter(Boolean).join("\n\n"),
    [data, files],
  );
  const { found, unlocked } = useMemo(() => detect(combined), [combined]);
  const hasPnl = found.some((s) => s.id === "pnl");

  const set = <K extends keyof Answers>(k: K, v: Answers[K]) => setAnswers((a) => ({ ...a, [k]: v }));
  const toggleChange = (c: string) =>
    set("changes", answers.changes.includes(c) ? answers.changes.filter((x) => x !== c) : [...answers.changes, c]);

  async function addFiles(list: FileList | null) {
    if (!list) return;
    const next: Upload[] = [];
    for (const f of Array.from(list)) {
      if (!/\.(csv|tsv|txt|md|json)$/i.test(f.name)) {
        setError(`${f.name}: only CSV, TSV, TXT, MD or JSON exports are supported. Save Excel sheets as CSV first.`);
        continue;
      }
      const text = await f.text();
      if (files.some((x) => x.text === text) || next.some((x) => x.text === text)) {
        setError(`${f.name} is a duplicate of a file you already added, so it was skipped.`);
        continue;
      }
      next.push({ name: f.name, size: f.size, kind: detectFileType(f.name, text), text });
    }
    setFiles((cur) => [...cur, ...next]);
  }

  function loadCase(c: DemoCase) {
    setActiveCase(c.id);
    setAnswers(c.answers);
    setData(c.data);
    setFiles([]);
    setResult(null);
    setError(null);
    document.getElementById("try")?.scrollIntoView({ behavior: "smooth" });
  }

  // The chat assistant can load a sample case by id.
  useEffect(() => {
    const onLoad = (e: Event) => {
      const c = CASES.find((x) => x.id === (e as CustomEvent<string>).detail);
      if (c) loadCase(c);
    };
    window.addEventListener("losslens:load-case", onLoad);
    return () => window.removeEventListener("losslens:load-case", onLoad);
  });

  function reset() {
    setActiveCase(null);
    setAnswers(EMPTY);
    setData("");
    setFiles([]);
    setResult(null);
    setError(null);
  }

  async function analyze() {
    setLoading(true);
    setError(null);
    setNoTokens(false);
    setResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: buildPayload(answers, combined) }),
      });
      const json = await res.json().catch(() => null);
      emitWallet(json?.wallet as PublicWallet | undefined);
      if (res.status === 402) {
        setNoTokens(true);
        throw new Error(json?.error || "Not enough tokens.");
      }
      if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
      setResult(json as Result);
      setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }), 80);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <Nav active="home" />

      <Hero />

      {/* Ticker */}
      <div className="border-y py-4" style={{ borderColor: "var(--line)", background: "var(--bg-2)" }}>
        <div className="overflow-hidden" style={{ maskImage: "linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent)" }}>
          <div className="marquee-track gap-10">
            {[...TICKER, ...TICKER].map((t, i) => (
              <span key={i} className="mono flex items-center gap-3 whitespace-nowrap text-xs uppercase tracking-widest muted">
                <span style={{ color: "var(--cyan)" }}>◆</span> {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Architecture */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-28">
        <SectionHead
          kicker="architecture"
          title={<>The AI reasons. <span className="gradient-text">Code does the math.</span></>}
          sub="Most AI analysts make up numbers. LossLens splits the work: a deterministic engine owns every core figure, the model owns judgement, and a verifier holds both to account."
        />
        <Pipeline />

        <Reveal className="mt-20">
          <p className="label text-center muted">inside the reasoning layer</p>
        </Reveal>
        <div className="rainbow mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEP_LIST.map((s, i) => (
            <Reveal key={s.t} delay={i * 60}>
              <div className="card spot lift h-full p-4">
                <div className="flex items-center gap-3">
                  <span className="tint-text mono text-xs font-bold">S{i + 1}</span>
                  <p className="font-medium">{s.t}</p>
                </div>
                <p className="mt-2 text-xs leading-relaxed muted">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Guardrails */}
      <section id="guardrails" className="scroll-mt-20 border-y py-28" style={{ borderColor: "var(--line)", background: "var(--bg-2)" }}>
        <div className="mx-auto max-w-6xl px-4">
          <SectionHead
            kicker="guardrails"
            title="Built to not hallucinate."
            sub="Each failure mode seen in real loss cases has a matching check. Live checks run in code on every report. Framework rules are enforced inside the reasoning method."
          />
          <div className="rainbow mt-14 grid gap-3 md:grid-cols-3">
            {GUARDS.map((g, i) => (
              <Reveal key={g.t} delay={i * 50}>
                <div className="card spot lift h-full p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="label" style={{ color: g.live ? "var(--good)" : "var(--violet)" }}>{g.live ? "● live check" : "○ framework rule"}</span>
                    <span className="mono text-xs muted">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <p className="mt-3 font-medium line-through decoration-rose-400/60">{g.t}</p>
                  <p className="mt-2 text-sm leading-relaxed muted">{g.fix}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Cases */}
      <section id="cases" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-28">
        <SectionHead
          kicker="simulations"
          title="Four stores. Four different failures."
          sub="Each fictional store is built so the obvious guess is wrong. Load one and the agent's intake fills in for you."
        />
        <div className="mt-14 grid gap-4 sm:grid-cols-2">
          {CASES.map((c, i) => (
            <Reveal key={c.id} delay={i * 90}>
              <button
                type="button"
                onClick={() => loadCase(c)}
                className={`card spot hud lift group relative h-full w-full overflow-hidden p-6 text-left ${activeCase === c.id ? "glow-border" : ""}`}
              >
                <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full opacity-20 blur-3xl transition-opacity group-hover:opacity-50" style={{ background: c.accent }} />
                <div className="flex items-center justify-between gap-3">
                  <span className="label rounded-md px-2 py-1" style={{ background: `${c.accent}1f`, color: c.accent }}>lens · {c.lens}</span>
                  <span className="mono text-[11px] muted">case_{String(i + 1).padStart(2, "0")}</span>
                </div>
                <p className="font-display mt-5 text-2xl font-semibold">{c.title}</p>
                <p className="mt-2 text-sm muted">{c.hook}</p>
                <div className="mt-6 flex items-center justify-between text-xs">
                  <span className="muted">root cause: <span className="mono text-ink blur-[4px] transition group-hover:blur-0">{c.pattern}</span></span>
                  <span className="mono font-semibold transition-transform group-hover:translate-x-1" style={{ color: c.accent }}>load →</span>
                </div>
              </button>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Intake */}
      <section id="try" className="scroll-mt-20 border-t py-28" style={{ borderColor: "var(--line)", background: "var(--bg-2)" }}>
        <div className="mx-auto max-w-6xl px-4">
          <SectionHead kicker="launch" title={<>Brief the <span className="gradient-text">agent</span>.</>} sub="Four questions for context, then drop your exports. The agent shows which steps your data unlocks before it starts." />

          <Reveal className="mt-14">
            <div className="card hud glow-border p-5 sm:p-8" style={{ background: "var(--panel)" }}>
              <div className="grid gap-10 lg:grid-cols-2">
                {/* Questions */}
                <div className="space-y-7">
                  <Q n={1} label="Which store, and what does it sell?">
                    <input className="field w-full px-3.5 py-2.5 text-sm" placeholder="Store / brand name" value={answers.seller} onChange={(e) => set("seller", e.target.value)} />
                    <div className="mt-3 flex flex-wrap gap-2">
                      {CATEGORIES.map((c) => (
                        <button key={c} type="button" data-on={answers.category === c} onClick={() => set("category", answers.category === c ? "" : c)} className="chip px-3 py-1.5 text-xs">{c}</button>
                      ))}
                    </div>
                  </Q>
                  <Q n={2} label="Which week lost money?" hint="Leave blank and the engine picks the most recent loss week.">
                    <input className="field mono w-full px-3.5 py-2.5 text-sm" placeholder="W40 2026" value={answers.lossWeek} onChange={(e) => set("lossWeek", e.target.value)} />
                  </Q>
                  <Q n={3} label="What do you think is hurting most?" hint="A hypothesis. The agent will confirm it or overturn it.">
                    <div className="flex flex-wrap gap-2">
                      {LENSES.map((l) => (
                        <button key={l} type="button" data-on={answers.suspect === l} onClick={() => set("suspect", l)} className="chip mono px-3.5 py-1.5 text-xs font-medium">{l}</button>
                      ))}
                    </div>
                  </Q>
                  <Q n={4} label="What changed recently?" hint="Pick all that apply.">
                    <div className="flex flex-wrap gap-2">
                      {CHANGE_OPTIONS.map((c) => (
                        <button key={c} type="button" data-on={answers.changes.includes(c)} onClick={() => toggleChange(c)} className="chip px-3 py-1.5 text-xs">{c}</button>
                      ))}
                    </div>
                    <textarea className="field mt-3 h-20 w-full resize-none px-3.5 py-2.5 text-sm" placeholder="Anything else the analyst should know? (optional)" value={answers.notes} onChange={(e) => set("notes", e.target.value)} />
                  </Q>
                </div>

                {/* Data */}
                <div className="flex flex-col">
                  <div className="flex items-baseline justify-between gap-2">
                    <label className="flex items-baseline gap-2 text-sm font-medium">
                      <span className="mono text-xs" style={{ color: "var(--cyan)" }}>05</span>
                      Feed it data
                    </label>
                    <span className="mono text-[11px]" style={{ color: combined.length > MAX_CHARS ? "var(--loss)" : "var(--muted)" }}>
                      {combined.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                    </span>
                  </div>

                  <div
                    className="dropzone mt-3 flex cursor-pointer flex-col items-center justify-center px-4 py-6 text-center"
                    data-over={over}
                    onClick={() => fileInput.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setOver(true); }}
                    onDragLeave={() => setOver(false)}
                    onDrop={(e) => { e.preventDefault(); setOver(false); addFiles(e.dataTransfer.files); }}
                  >
                    <span className="text-2xl" style={{ color: "var(--cyan)" }}>⇪</span>
                    <p className="mt-1 text-sm">Drop CSV exports here <span className="muted">or click to browse</span></p>
                    <p className="mono mt-1 text-[11px] muted">PnL · campaigns · changelog · audience · state · product · fulfilment</p>
                    <input ref={fileInput} type="file" multiple accept=".csv,.tsv,.txt,.md,.json" className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
                  </div>

                  {files.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {files.map((f, i) => (
                        <li key={f.name + i} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "var(--line)" }}>
                          <span className="mono truncate">{f.name}</span>
                          <span className="flex shrink-0 items-center gap-3">
                            <span style={{ color: f.kind === "Unrecognised" ? "var(--warn)" : "var(--good)" }}>{f.kind}</span>
                            <button type="button" className="muted hover-ink" onClick={() => setFiles((cur) => cur.filter((_, j) => j !== i))}>✕</button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <textarea
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    placeholder={"…or paste tables here\n\n=== SELLER PnL (weekly) ===\nWeek,Spend,GMV,RTO%,Spend/GMV%,COGS%,Cancel%,Net Profit%\nW38 2026,119000,588000,38.9,20.2,31.3,4.9,-0.8"}
                    className="field mono mt-3 min-h-52 w-full flex-1 resize-y p-3.5 text-xs leading-relaxed"
                  />

                  {/* Unlock matrix */}
                  <div className="mt-4 rounded-xl border p-3.5" style={{ borderColor: "var(--line)", background: "var(--well)" }}>
                    <div className="flex items-center justify-between">
                      <p className="label muted">step unlock matrix</p>
                      <p className="mono text-[11px]" style={{ color: hasPnl ? "var(--good)" : "var(--warn)" }}>{hasPnl ? "PnL ✓ ready" : "PnL required"}</p>
                    </div>
                    <div className="mt-3 grid grid-cols-9 gap-1.5">
                      {STEP_NAMES.map((name, i) => {
                        const on = unlocked.has(i) && (i === 0 || hasPnl);
                        return (
                          <div key={name} title={name} className="flex flex-col items-center gap-1">
                            <div className="mono flex h-8 w-full items-center justify-center rounded-md text-[11px] font-semibold transition-all duration-300" style={{
                              background: on ? "linear-gradient(135deg, color-mix(in srgb, var(--cyan) 25%, transparent), color-mix(in srgb, var(--violet) 25%, transparent))" : "color-mix(in srgb, var(--ink) 3%, transparent)",
                              color: on ? "var(--ink)" : "var(--dim)",
                              boxShadow: on ? "inset 0 0 0 1px color-mix(in srgb, var(--cyan) 60%, transparent), 0 0 14px -4px color-mix(in srgb, var(--cyan) 80%, transparent)" : "inset 0 0 0 1px var(--line)",
                            }}>{i}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {SOURCES.map((s) => {
                        const on = found.includes(s);
                        return (
                          <span key={s.id} className="rounded px-1.5 py-0.5 text-[10.5px]" style={{ color: on ? "var(--good)" : "var(--dim)", background: on ? "color-mix(in srgb, var(--good) 8%, transparent)" : "transparent" }}>
                            {on ? "✓" : "·"} {s.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t pt-6" style={{ borderColor: "var(--line)" }}>
                <div className="mono text-xs muted">
                  {found.length === 0 ? "> awaiting data · load a simulation or drop files" : `> ${found.length} source${found.length > 1 ? "s" : ""} · ${[...unlocked].length - 1}/8 steps unlocked`}
                </div>
                <div className="flex gap-3">
                  {(combined || answers.seller) && (
                    <button type="button" onClick={reset} className="btn-ghost rounded-xl px-4 py-2.5 text-sm">Reset</button>
                  )}
                  <button
                    type="button"
                    onClick={analyze}
                    disabled={loading || combined.length < 50 || combined.length > MAX_CHARS}
                    className="btn-primary rounded-xl px-6 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {loading ? "Agent running…" : FEATURES.tokens ? `Run the agent · ⬡ ${PRICING.cost.troubleshoot} →` : "Run the agent →"}
                  </button>
                </div>
              </div>

              {error && (
                <p className="animate-fade-up mt-5 rounded-xl border p-3.5 text-sm" style={{ borderColor: "color-mix(in srgb, var(--loss) 50%, transparent)", background: "color-mix(in srgb, var(--loss) 8%, transparent)", color: "var(--loss-ink)" }}>
                  {error}
                  {noTokens && (
                    <> <a href="/pricing" className="ml-1 font-semibold underline" style={{ color: "var(--accent-ink)" }}>Get demo tokens →</a></>
                  )}
                </p>
              )}
            </div>
          </Reveal>

          {loading && <Progress />}

          {result && (
            <div id="results" className="animate-fade-up mt-14 scroll-mt-20 space-y-8">
              <EnginePanel engine={result.engine} checks={result.checks} analysis={result.analysis} />
              <Dashboard d={result.analysis.dashboard} />
              <Report markdown={result.analysis.report_markdown} />
            </div>
          )}
        </div>
      </section>

      {/* Studio promo (feature-switched) */}
      {FEATURES.studio && (
        <section className="mx-auto max-w-6xl px-4 pt-28">
          <Reveal>
            <a href="/studio" className="card hud glow-border spot group grid items-center gap-8 overflow-hidden p-8 sm:p-10 md:grid-cols-[1.2fr_1fr]">
              <div>
                <p className="label" style={{ color: "var(--pink-ink)" }}>{"// new · section studio"}</p>
                <h2 className="font-display mt-3 text-3xl font-bold sm:text-4xl">Fixed the leak? <span className="gradient-text">Rebuild the storefront.</span></h2>
                <p className="mt-4 muted">
                  Describe a Shopify section in plain English: hero, product grid, testimonials, FAQ, trust badges. The AI writes
                  production-ready Liquid with theme-editor settings. Preview it live, refine it by chat, and download.
                </p>
                <p className="mono mt-5 text-sm font-semibold transition-transform group-hover:translate-x-1" style={{ color: "var(--cyan)" }}>
                  Open Section Studio →{FEATURES.tokens && <span className="ml-2 font-normal muted">{PRICING.freeThemePerDay} free per day</span>}
                </p>
              </div>
              <div className="term mono rounded-xl border p-4 text-[11.5px] leading-relaxed" style={{ borderColor: "var(--line)", background: "var(--well)", color: "var(--muted)" }}>
                <div><span style={{ color: "var(--pink)" }}>{"{%"}</span> schema <span style={{ color: "var(--pink)" }}>{"%}"}</span></div>
                <div className="pl-3">{"{"} <span style={{ color: "var(--accent-ink)" }}>&quot;name&quot;</span>: <span style={{ color: "var(--good)" }}>&quot;Hero banner&quot;</span>,</div>
                <div className="pl-3"><span style={{ color: "var(--accent-ink)" }}>&quot;settings&quot;</span>: [ … 12 settings ],</div>
                <div className="pl-3"><span style={{ color: "var(--accent-ink)" }}>&quot;blocks&quot;</span>: [ button × 2 ],</div>
                <div className="pl-3"><span style={{ color: "var(--accent-ink)" }}>&quot;presets&quot;</span>: [ … ] {"}"}</div>
                <div><span style={{ color: "var(--pink)" }}>{"{%"}</span> endschema <span style={{ color: "var(--pink)" }}>{"%}"}</span></div>
                <div className="mt-2" style={{ color: "var(--good)" }}>✓ schema valid · ✓ presets · ✓ scoped CSS</div>
              </div>
            </a>
          </Reveal>
        </section>
      )}

      {/* Roadmap */}
      <section className="mx-auto max-w-6xl px-4 py-28">
        <SectionHead kicker="roadmap" title="Where this goes next." />
        <div className="rainbow mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ROADMAP.map((r, i) => (
            <Reveal key={r.t} delay={i * 80}>
              <div className={`card spot h-full p-5 ${r.on ? "glow-border" : ""}`}>
                <p className="label" style={{ color: r.on ? "var(--good)" : "var(--muted)" }}>{r.on ? "● " : "○ "}{r.when}</p>
                <p className="font-display mt-3 text-lg font-semibold">{r.t}</p>
                <p className="mt-2 text-sm leading-relaxed muted">{r.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 border-t py-28" style={{ borderColor: "var(--line)", background: "var(--bg-2)" }}>
        <div className="mx-auto max-w-3xl px-4">
          <SectionHead kicker="faq" title="Before you trust it." />
          <Reveal className="mt-12"><Faq /></Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative overflow-hidden border-t px-4 py-14" style={{ borderColor: "var(--line)" }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 text-center sm:flex-row sm:text-left">
          <div>
            <p className="font-display text-xl font-semibold">
              Loss<span className="gradient-text">Lens</span> <span className="muted">· built by</span>{" "}
              <a href={SITE.linkedin} target="_blank" rel="noreferrer" className="hover:underline">{SITE.authorName}</a>
            </p>
            <p className="mt-1 text-xs muted">The method is distilled from 12+ real store loss cases. Sample stores are fictional. Powered by Claude.</p>
          </div>
          <div className="flex gap-3 text-sm">
            <a href={SITE.linkedin} target="_blank" rel="noreferrer" className="btn-ghost rounded-lg px-4 py-2">LinkedIn</a>
          </div>
        </div>
      </footer>

      <ChatWidget />
    </main>
  );
}
