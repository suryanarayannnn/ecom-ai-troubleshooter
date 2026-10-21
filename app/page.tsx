"use client";

import { useState } from "react";
import type { Analysis } from "@/lib/schema";
import { SAMPLE_DATA } from "@/lib/sampleData";
import { SITE } from "@/lib/site";
import Dashboard from "@/components/Dashboard";
import Report from "@/components/Report";

const STEPS = [
  "Benchmark", "Problem metric", "Changelog", "Fulfilment",
  "Audience", "Product", "Geo", "Campaign L3",
];

export default function Home() {
  const [data, setData] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Analysis | null>(null);

  async function analyze() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
      setResult(json as Analysis);
      setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      {/* Hero */}
      <header className="mb-10">
        <p className="text-sm font-medium tracking-wide uppercase muted">AI diagnostic tool · D2C / Facebook sellers</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-bold leading-tight">
          Find out <span style={{ color: "var(--loss)" }}>why a week lost money</span>, down to the campaign.
        </h1>
        <p className="mt-4 max-w-3xl text-base sm:text-lg muted">
          Paste a seller&apos;s PnL, campaign, audience, state and fulfilment data. The analyst picks a valid
          benchmark, flags the problem metric (RTO, S/GMV, COGS, Cancel), rules dimensions in or out, and
          lands on an L3 root cause (Campaign × Dimension) with a ₹-quantified action plan.
        </p>
        <ol className="mt-5 flex flex-wrap gap-2 text-xs">
          {STEPS.map((s, i) => (
            <li key={s} className="card px-3 py-1.5">
              <span className="muted">{i + 1}.</span> {s}
            </li>
          ))}
        </ol>
        <p className="mt-5 text-sm muted">
          Built by <strong style={{ color: "var(--ink)" }}>{SITE.authorName}</strong> · {SITE.authorRole} ·{" "}
          <a className="underline" href={SITE.linkedin} target="_blank" rel="noreferrer">LinkedIn</a> ·{" "}
          <a className="underline" href={SITE.github} target="_blank" rel="noreferrer">GitHub</a>
        </p>
      </header>

      {/* Input */}
      <section className="card p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Seller data</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setData(SAMPLE_DATA)}
              className="rounded-lg border px-3 py-1.5 text-sm"
              style={{ borderColor: "var(--line)" }}
            >
              Load sample seller
            </button>
            {data && (
              <button
                type="button"
                onClick={() => { setData(""); setResult(null); setError(null); }}
                className="rounded-lg border px-3 py-1.5 text-sm"
                style={{ borderColor: "var(--line)" }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <p className="mt-1 text-sm muted">
          Paste CSV rows, tables or notes: weekly PnL (required), plus any of changelog, campaign PnL, gender/age/platform,
          state, product, fulfilment. Missing pieces are flagged, never invented.
        </p>
        <textarea
          value={data}
          onChange={(e) => setData(e.target.value)}
          placeholder={"Week,Spend,GMV,RTO%,Spend/GMV%,COGS%,Cancel%,Net Profit%\nW38 2026,119000,588000,38.9,20.2,31.3,4.9,-0.8\n..."}
          className="mt-4 h-72 w-full resize-y rounded-lg border p-3 font-mono text-xs sm:text-sm outline-none"
          style={{ background: "var(--bg)", borderColor: "var(--line)", color: "var(--ink)" }}
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={analyze}
            disabled={loading || data.trim().length < 50}
            className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: "var(--ink)", color: "var(--bg)" }}
          >
            {loading ? "Running 8-step diagnostic…" : "Run diagnostic"}
          </button>
          <span className="text-xs muted">{data.length.toLocaleString()} / 60,000 chars</span>
          {loading && <span className="text-xs muted">Usually takes 1–3 minutes.</span>}
        </div>
        {error && (
          <p className="mt-4 rounded-lg border p-3 text-sm" style={{ borderColor: "var(--loss)", color: "var(--loss)" }}>
            {error}
          </p>
        )}
      </section>

      {result && (
        <div id="results" className="mt-10 space-y-8">
          <Dashboard d={result.dashboard} />
          <Report markdown={result.report_markdown} />
        </div>
      )}

      <footer className="mt-16 text-center text-xs muted">
        Demo tool. The sample seller is fictional. Don&apos;t paste data you aren&apos;t allowed to share.
      </footer>
    </main>
  );
}
