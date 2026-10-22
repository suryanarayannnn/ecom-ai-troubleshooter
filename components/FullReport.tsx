"use client";

import { useEffect, useState } from "react";
import type { Analysis } from "@/lib/schema";
import { FEATURES } from "@/lib/features";
import { PRICING, type PublicWallet } from "@/lib/pricing";
import { emitWallet } from "@/lib/useWallet";

const STAGES = ["Diagnose", "Strategy", "Action plan"];

export default function FullReport({ data, analysis }: { data: string; analysis: Analysis }) {
  const [html, setHtml] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState(0);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!busy) return;
    setStage(0);
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 25_000);
    return () => clearInterval(t);
  }, [busy]);

  useEffect(() => {
    if (!html) return;
    const u = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [html]);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, analysis }),
      });
      const json = await res.json().catch(() => null);
      emitWallet(json?.wallet as PublicWallet | undefined);
      if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
      setHtml(json.html);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const file = `losslens-${(analysis.dashboard.header.seller || "store").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${(analysis.dashboard.header.loss_week || "report").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.html`;

  return (
    <section className="card hud glow-border p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label" style={{ color: "var(--violet)" }}>full troubleshoot report</p>
          <h3 className="font-display mt-1 text-xl font-semibold">Diagnose → Strategy → Action plan</h3>
          <p className="mt-1 max-w-xl text-sm muted">
            A shareable report with KPI tiles, recovery sizing, up to 3 strategies and step-by-step operator actions. Numbers come from the engine; the AI writes the reasoning.
          </p>
        </div>
        {!html && (
          <button type="button" onClick={generate} disabled={busy} className="btn-primary rounded-xl px-5 py-2.5 text-sm disabled:opacity-50">
            {busy ? "Writing report…" : `Generate full report${FEATURES.tokens ? ` · ⬡ ${PRICING.cost.fullReport}` : ""}`}
          </button>
        )}
        {html && url && (
          <div className="flex gap-2">
            <a href={url} target="_blank" rel="noreferrer" className="btn-ghost rounded-xl px-4 py-2.5 text-sm">Open in new tab ↗</a>
            <a href={url} download={file} className="btn-primary rounded-xl px-4 py-2.5 text-sm">⤓ Download HTML</a>
          </div>
        )}
      </div>

      {busy && (
        <div className="mt-5 flex flex-wrap gap-2">
          {STAGES.map((s, i) => (
            <span key={s} className="label rounded-md px-2.5 py-1.5" style={{
              background: i === stage ? "color-mix(in srgb, var(--violet) 15%, transparent)" : "transparent",
              color: i < stage ? "var(--good)" : i === stage ? "var(--violet)" : "var(--dim)",
              border: "1px solid var(--line)",
            }}>{i < stage ? "✓ " : i === stage ? "› " : ""}{i + 1} · {s}</span>
          ))}
          <span className="text-xs muted self-center">Usually 1–3 minutes.</span>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-xl border p-3 text-sm" style={{ borderColor: "color-mix(in srgb, var(--loss) 50%, transparent)", color: "var(--loss-ink)" }}>
          {error}{error.includes("tokens") && <> <a href="/pricing" className="font-semibold underline">Get demo tokens →</a></>}
        </p>
      )}

      {html && (
        <iframe title="Full troubleshoot report" sandbox="allow-same-origin" srcDoc={html} className="mt-5 h-[720px] w-full rounded-xl border bg-white" style={{ borderColor: "var(--line)" }} />
      )}
    </section>
  );
}
