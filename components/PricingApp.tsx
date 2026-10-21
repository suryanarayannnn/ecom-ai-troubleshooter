"use client";

import { useState } from "react";
import Nav from "@/components/Nav";
import ChatWidget from "@/components/ChatWidget";
import Reveal from "@/components/Reveal";
import { FEATURES } from "@/lib/features";
import { PRICING } from "@/lib/pricing";
import { useWallet } from "@/lib/useWallet";

const ROWS = [
  { f: "Ask Lens assistant", c: "Free", note: "Unlimited help, within fair-use limits" },
  ...(FEATURES.studio ? [
    { f: "Section Studio · Standard", c: `${PRICING.freeThemePerDay} free / day, then ⬡ ${PRICING.cost.themeStandard}`, note: "Fast model. Generate or refine." },
    { f: "Section Studio · Pro", c: `⬡ ${PRICING.cost.themePro}`, note: "Top model, best for complex sections" },
  ] : []),
  { f: "Troubleshoot run", c: `⬡ ${PRICING.cost.troubleshoot}`, note: "Full 8-step diagnosis with engine + verifier" },
];

function timeLeft(ts: number) {
  const ms = ts - Date.now();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.ceil((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function PricingApp() {
  const { wallet, topUp } = useWallet();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function claim() {
    setBusy(true);
    const err = await topUp();
    setMsg(err ?? `+${PRICING.topupTokens} demo tokens added.`);
    setBusy(false);
  }

  return (
    <main>
      <Nav active="pricing" />

      <section className="relative overflow-hidden pt-28 pb-16">
        <div className="grid-bg absolute inset-0 -z-10" />
        <div className="orb -z-10" style={{ width: 420, height: 420, left: "30%", top: "-30%", background: "#22d3ee", opacity: 0.25 }} />
        <div className="mx-auto max-w-5xl px-4 text-center">
          <p className="label" style={{ color: "var(--cyan)" }}>{"// tokens"}</p>
          <h1 className="font-display mt-3 text-4xl font-bold sm:text-6xl">Free to start. <span className="gradient-text">Tokens to scale.</span></h1>
          <p className="mx-auto mt-4 max-w-xl muted">One balance works across every tool. New visitors start with {PRICING.startTokens} tokens.</p>

          <div className="card hud glow-border mx-auto mt-10 max-w-md p-6" style={{ background: "rgba(5,7,14,.8)" }}>
            <p className="label muted">your balance</p>
            <p className="font-display mt-2 text-6xl font-bold"><span style={{ color: "var(--cyan)" }}>⬡</span> {wallet ? wallet.balance : "··"}</p>
            {FEATURES.studio && wallet && <p className="mt-1 text-xs muted">{wallet.freeThemeLeft} free Studio generations left today</p>}
            <button type="button" onClick={claim} disabled={busy || !wallet?.canTopUp} className="btn-primary mt-5 w-full rounded-xl px-4 py-3 text-sm disabled:opacity-40">
              {wallet && !wallet.canTopUp && wallet.nextTopUpAt ? `Next free top-up in ${timeLeft(wallet.nextTopUpAt)}` : `Claim ${PRICING.topupTokens} free demo tokens`}
            </button>
            {msg && <p className="mt-3 text-xs" style={{ color: "var(--good)" }}>{msg}</p>}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16">
        <Reveal>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ background: "rgba(34,211,238,.05)" }}>
                  <th className="label px-5 py-3 muted">feature</th><th className="label px-5 py-3 muted">cost</th><th className="label hidden px-5 py-3 muted sm:table-cell">details</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.f} className="border-t" style={{ borderColor: "var(--line)" }}>
                    <td className="px-5 py-3.5 font-medium">{r.f}</td>
                    <td className="mono px-5 py-3.5" style={{ color: r.c === "Free" ? "var(--good)" : "#a5f3fc" }}>{r.c}</td>
                    <td className="hidden px-5 py-3.5 muted sm:table-cell">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-28">
        <div className="grid gap-4 md:grid-cols-3">
          {PRICING.packs.map((p, i) => (
            <Reveal key={p.name} delay={i * 90}>
              <div className={`card spot hud h-full p-6 ${"popular" in p && p.popular ? "glow-border" : ""}`}>
                <div className="flex items-center justify-between">
                  <p className="font-display text-xl font-semibold">{p.name}</p>
                  {"popular" in p && p.popular && <span className="label rounded px-1.5 py-0.5" style={{ fontSize: 9.5, background: "rgba(34,211,238,.15)", color: "#a5f3fc" }}>popular</span>}
                </div>
                <p className="font-display mt-4 text-4xl font-bold">{p.price}</p>
                <p className="mono mt-1 text-sm" style={{ color: "var(--cyan)" }}>⬡ {p.tokens.toLocaleString()} tokens</p>
                <p className="mt-3 text-sm muted">{p.blurb}</p>
                <button type="button" disabled className="btn-ghost mt-6 w-full cursor-not-allowed rounded-xl px-4 py-2.5 text-sm opacity-60">Payments coming soon</button>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 text-center text-xs muted">
          Demo mode: no payments are taken and prices are indicative. Balances are stored in this browser, so clearing cookies resets them.
        </p>
      </section>

      <ChatWidget />
    </main>
  );
}
