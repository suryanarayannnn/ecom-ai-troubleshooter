"use client";

import { FEATURES } from "@/lib/features";
import { SITE } from "@/lib/site";
import { useWallet } from "@/lib/useWallet";
import ThemeToggle from "@/components/ThemeToggle";

function WalletPill() {
  const { wallet } = useWallet();
  return (
    <a
      href="/pricing"
      className="mono flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition hover:brightness-125"
      style={{ background: "color-mix(in srgb, var(--cyan) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--cyan) 35%, transparent)", color: "var(--accent-ink)" }}
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
    <a href={href} className={`hidden md:inline ${active === key ? "text-ink" : "muted hover-ink"}`}>{label}</a>
  );
  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b backdrop-blur-xl" style={{ borderColor: "var(--line)", background: "var(--nav-bg)" }}>
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <a href="/" className="font-display flex items-center gap-2 text-lg font-bold">
          <span className="relative flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "var(--grad)" }}>
            <span className="h-3 w-3 rounded-full border-2" style={{ borderColor: "var(--on-grad)" }} />
          </span>
          <span>Loss<span className="gradient-text">Lens</span></span>
        </a>
        <div className="flex items-center gap-2 text-sm sm:gap-6">
          {link("/#try", "Troubleshooter", "home")}
          {FEATURES.studio && (
            <a href="/studio" className={`flex items-center gap-1.5 ${active === "studio" ? "text-ink" : "muted hover-ink"}`}>
              Studio
              <span className="label rounded px-1 py-px" style={{ fontSize: 9, background: "color-mix(in srgb, var(--pink) 15%, transparent)", color: "var(--pink-ink)" }}>new</span>
            </a>
          )}
          {FEATURES.tokens && link("/pricing", "Pricing", "pricing")}
          {link("/#faq", "FAQ")}
          {FEATURES.tokens && <WalletPill />}
          <ThemeToggle />
          <a href={SITE.linkedin} target="_blank" rel="noreferrer" className="btn-ghost hidden rounded-lg px-3 py-1.5 text-xs font-medium lg:inline-block">
            {SITE.authorName} ↗
          </a>
        </div>
      </div>
    </nav>
  );
}
