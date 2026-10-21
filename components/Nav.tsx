"use client";

import { FEATURES } from "@/lib/features";
import { SITE } from "@/lib/site";
import { useWallet } from "@/lib/useWallet";

function WalletPill() {
  const { wallet } = useWallet();
  return (
    <a
      href="/pricing"
      className="mono flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition hover:brightness-125"
      style={{ background: "rgba(34,211,238,.10)", border: "1px solid rgba(34,211,238,.35)", color: "#a5f3fc" }}
      title="Your demo token balance"
    >
      <span style={{ color: "var(--cyan)" }}>⬡</span>
      {wallet ? wallet.balance : "··"}
      <span className="hidden sm:inline font-normal muted">tokens</span>
    </a>
  );
}

export default function Nav({ active }: { active?: "home" | "studio" | "pricing" }) {
  const link = (href: string, label: string, key?: string) => (
    <a href={href} className={`hidden md:inline ${active === key ? "text-white" : "muted hover:text-white"}`}>{label}</a>
  );
  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b backdrop-blur-xl" style={{ borderColor: "var(--line)", background: "rgba(4,5,10,.65)" }}>
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <a href="/" className="font-display flex items-center gap-2 text-lg font-bold">
          <span className="relative flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "var(--grad)" }}>
            <span className="h-3 w-3 rounded-full border-2" style={{ borderColor: "#04050a" }} />
          </span>
          <span>Loss<span className="gradient-text">Lens</span></span>
        </a>
        <div className="flex items-center gap-2 text-sm sm:gap-6">
          {link("/#try", "Troubleshooter", "home")}
          {FEATURES.studio && (
            <a href="/studio" className={`flex items-center gap-1.5 ${active === "studio" ? "text-white" : "muted hover:text-white"}`}>
              Studio
              <span className="label rounded px-1 py-px" style={{ fontSize: 9, background: "rgba(244,114,182,.15)", color: "#f9a8d4" }}>new</span>
            </a>
          )}
          {FEATURES.tokens && link("/pricing", "Pricing", "pricing")}
          {link("/#faq", "FAQ")}
          {FEATURES.tokens && <WalletPill />}
          <a href={SITE.linkedin} target="_blank" rel="noreferrer" className="btn-ghost hidden rounded-lg px-3 py-1.5 text-xs font-medium lg:inline-block">
            {SITE.authorName} ↗
          </a>
        </div>
      </div>
    </nav>
  );
}
