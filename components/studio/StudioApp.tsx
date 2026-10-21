"use client";

import { useEffect, useMemo, useState } from "react";
import Nav from "@/components/Nav";
import ChatWidget from "@/components/ChatWidget";
import { FEATURES } from "@/lib/features";
import { PRICING, type PublicWallet } from "@/lib/pricing";
import { emitWallet, useWallet } from "@/lib/useWallet";
import { FONTS, PRESETS, VIBES, type BrandStyle, type GeneratedSection } from "@/lib/theme";

type Check = { ok: boolean; issues: string[]; settings: number; blocks: number };
type Version = { section: GeneratedSection; check: Check; model: string; prompt: string; at: number };
type Saved = { id: string; name: string; at: number; style: BrandStyle; versions: Version[] };

const HISTORY_KEY = "losslens-studio";
const DEFAULT_STYLE: BrandStyle = { brand: "", primary: "#111827", accent: "#e11d48", font: "Inter", corners: "soft", vibe: "Minimal" };

function previewDoc(html: string, font: string) {
  const family = encodeURIComponent(font).replace(/%20/g, "+");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${family}:wght@400;500;600;700&display=swap">
<style>*,*::before,*::after{box-sizing:border-box}body{margin:0;background:#fff;color:#111;font-family:'${font}',system-ui,sans-serif;-webkit-font-smoothing:antialiased}img{max-width:100%}</style>
</head><body>${html}</body></html>`;
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";
}

const STEPS = ["Reading your brief", "Designing the layout", "Writing the Liquid", "Building the settings schema", "Rendering the preview", "Checking the schema"];

export default function StudioApp() {
  const { wallet } = useWallet();
  const [style, setStyle] = useState<BrandStyle>(DEFAULT_STYLE);
  const [prompt, setPrompt] = useState("");
  const [refine, setRefine] = useState("");
  const [tier, setTier] = useState<"standard" | "pro">("standard");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<{ msg: string; tokens?: boolean } | null>(null);
  const [current, setCurrent] = useState<Saved | null>(null);
  const [vIdx, setVIdx] = useState(0);
  const [tab, setTab] = useState<"preview" | "code" | "install">("preview");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [history, setHistory] = useState<Saved[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try { const h = localStorage.getItem(HISTORY_KEY); if (h) setHistory(JSON.parse(h)); } catch { /* ignore */ }
  }, []);
  const persist = (h: Saved[]) => {
    setHistory(h);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 12))); } catch { /* quota or blocked */ }
  };

  useEffect(() => {
    if (!busy) return;
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 4500);
    return () => clearInterval(t);
  }, [busy]);

  const version = current?.versions[vIdx];
  const set = <K extends keyof BrandStyle>(k: K, v: BrandStyle[K]) => setStyle((s) => ({ ...s, [k]: v }));

  const costLabel = useMemo(() => {
    if (!FEATURES.tokens) return "free";
    if (tier === "pro") return `⬡ ${PRICING.cost.themePro}`;
    if (!wallet || wallet.freeThemeLeft > 0) return `free · ${wallet?.freeThemeLeft ?? PRICING.freeThemePerDay} left today`;
    return `⬡ ${PRICING.cost.themeStandard}`;
  }, [tier, wallet]);

  async function run(text: string, isRefine: boolean) {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          prompt: text,
          style: isRefine && current ? current.style : style,
          previous: isRefine && version ? { liquid: version.section.liquid, preview_html: version.section.preview_html } : undefined,
        }),
      });
      const json = await res.json().catch(() => null);
      emitWallet(json?.wallet as PublicWallet | undefined);
      if (!res.ok) {
        setError({ msg: json?.error || `Request failed (${res.status})`, tokens: res.status === 402 });
        return;
      }
      const v: Version = { section: json.section, check: json.check, model: json.model, prompt: text, at: Date.now() };
      let saved: Saved;
      if (isRefine && current) {
        saved = { ...current, name: v.section.name, at: v.at, versions: [...current.versions.slice(0, vIdx + 1), v] };
        setVIdx(vIdx + 1);
        setRefine("");
      } else {
        saved = { id: crypto.randomUUID(), name: v.section.name, at: v.at, style, versions: [v] };
        setVIdx(0);
      }
      setCurrent(saved);
      setTab("preview");
      persist([saved, ...history.filter((h) => h.id !== saved.id)]);
    } catch {
      setError({ msg: "Network error. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  function download() {
    if (!version) return;
    const blob = new Blob([version.section.liquid], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug(version.section.name)}.liquid`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copy() {
    if (!version) return;
    await navigator.clipboard.writeText(version.section.liquid);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <main>
      <Nav active="studio" />

      <section className="relative overflow-hidden pt-24 pb-8">
        <div className="grid-bg absolute inset-0 -z-10" />
        <div className="orb -z-10" style={{ width: 380, height: 380, right: "-6%", top: "-20%", background: "#f472b6", opacity: 0.25 }} />
        <div className="orb -z-10" style={{ width: 380, height: 380, left: "-8%", top: "-10%", background: "#8b5cf6", opacity: 0.3 }} />
        <div className="mx-auto max-w-7xl px-4">
          <p className="label animate-fade-up" style={{ color: "#f9a8d4" }}>{"// section studio · beta"}</p>
          <h1 className="font-display animate-fade-up mt-2 text-4xl font-bold sm:text-5xl">
            Describe it. <span className="gradient-text">Ship it to Shopify.</span>
          </h1>
          <p className="animate-fade-up mt-3 max-w-2xl muted">
            AI-built Online Store 2.0 sections with theme-editor settings, a live preview and chat refinement. Download the
            <span className="mono text-white"> .liquid</span> file and drop it into any theme.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-24 lg:grid-cols-[380px_1fr]">
        {/* ---------- Controls ---------- */}
        <div className="space-y-5">
          <div className="card hud p-5" style={{ background: "rgba(5,7,14,.75)" }}>
            <p className="label" style={{ color: "var(--cyan)" }}>01 · brand style</p>
            <input className="field mt-3 w-full px-3 py-2 text-sm" placeholder="Brand name" value={style.brand} onChange={(e) => set("brand", e.target.value)} />
            <div className="mt-3 grid grid-cols-2 gap-3">
              {(["primary", "accent"] as const).map((k) => (
                <label key={k} className="field flex items-center gap-2 px-2.5 py-2 text-xs capitalize">
                  <input type="color" value={style[k]} onChange={(e) => set(k, e.target.value)} className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0" />
                  <span className="muted">{k}</span>
                  <span className="mono ml-auto">{style[k]}</span>
                </label>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <select className="field px-2.5 py-2 text-sm" value={style.font} onChange={(e) => set("font", e.target.value)}>
                {FONTS.map((f) => <option key={f} value={f} style={{ background: "#0d1018" }}>{f}</option>)}
              </select>
              <select className="field px-2.5 py-2 text-sm" value={style.corners} onChange={(e) => set("corners", e.target.value as BrandStyle["corners"])}>
                {(["sharp", "soft", "round"] as const).map((c) => <option key={c} value={c} style={{ background: "#0d1018" }}>{c} corners</option>)}
              </select>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {VIBES.map((v) => (
                <button key={v} type="button" data-on={style.vibe === v} onClick={() => set("vibe", v)} className="chip px-2.5 py-1 text-xs">{v}</button>
              ))}
            </div>
          </div>

          <div className="card hud p-5" style={{ background: "rgba(5,7,14,.75)" }}>
            <p className="label" style={{ color: "var(--cyan)" }}>02 · describe the section</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button key={p.label} type="button" onClick={() => setPrompt(p.prompt)} className="chip px-2.5 py-1 text-xs">{p.label}</button>
              ))}
            </div>
            <textarea
              className="field mt-3 h-32 w-full resize-none px-3 py-2.5 text-sm"
              maxLength={1500}
              placeholder="e.g. A festive sale hero with a countdown-style headline, two buttons, and a soft gradient overlay…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />

            {FEATURES.tokens && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(["standard", "pro"] as const).map((t) => (
                  <button key={t} type="button" data-on={tier === t} onClick={() => setTier(t)} className="chip rounded-xl px-3 py-2 text-left" style={{ borderRadius: 12 }}>
                    <span className="block text-sm font-semibold capitalize">{t}</span>
                    <span className="block text-[11px] muted">
                      {t === "standard" ? `${PRICING.freeThemePerDay}/day free, then ⬡${PRICING.cost.themeStandard}` : `⬡${PRICING.cost.themePro} · higher quality`}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <button type="button" onClick={() => run(prompt, false)} disabled={busy || prompt.trim().length < 5} className="btn-primary mt-4 w-full rounded-xl px-4 py-3 text-sm disabled:opacity-40">
              {busy ? "Generating…" : `Generate section · ${costLabel}`}
            </button>
            {error && (
              <p className="mt-3 rounded-lg border p-2.5 text-xs" style={{ borderColor: "rgba(255,92,122,.45)", color: "#ffb3c1", background: "rgba(255,92,122,.08)" }}>
                {error.msg} {error.tokens && <a href="/pricing" className="font-semibold underline" style={{ color: "#a5f3fc" }}>Get demo tokens →</a>}
              </p>
            )}
          </div>

          {history.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <p className="label muted">your sections · this browser</p>
                <button type="button" className="mono text-[11px] muted hover:text-white" onClick={() => { persist([]); }}>clear</button>
              </div>
              <ul className="mt-3 space-y-1.5">
                {history.map((h) => (
                  <li key={h.id}>
                    <button type="button" onClick={() => { setCurrent(h); setVIdx(h.versions.length - 1); setStyle(h.style); }}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-white/5"
                      style={current?.id === h.id ? { background: "rgba(34,211,238,.08)" } : undefined}>
                      <span className="truncate">{h.name}</span>
                      <span className="mono shrink-0 text-[11px] muted">v{h.versions.length}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ---------- Canvas ---------- */}
        <div className="card hud flex min-h-[640px] flex-col overflow-hidden" style={{ background: "rgba(5,7,14,.75)" }}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: "var(--line)" }}>
            <div className="flex gap-1">
              {(["preview", "code", "install"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setTab(t)} className="label rounded-md px-2.5 py-1.5"
                  style={{ background: tab === t ? "rgba(34,211,238,.12)" : "transparent", color: tab === t ? "#a5f3fc" : "var(--muted)", border: `1px solid ${tab === t ? "rgba(34,211,238,.4)" : "transparent"}` }}>
                  {t}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {tab === "preview" && (["desktop", "mobile"] as const).map((d) => (
                <button key={d} type="button" onClick={() => setDevice(d)} className="mono rounded-md px-2 py-1 text-[11px]"
                  style={{ color: device === d ? "#fff" : "var(--muted)", background: device === d ? "rgba(255,255,255,.08)" : "transparent" }}>
                  {d === "desktop" ? "▭ desktop" : "▯ mobile"}
                </button>
              ))}
              {version && (
                <>
                  <button type="button" onClick={copy} className="btn-ghost mono rounded-md px-2.5 py-1 text-[11px]">{copied ? "copied ✓" : "copy"}</button>
                  <button type="button" onClick={download} className="btn-primary mono rounded-md px-2.5 py-1 text-[11px]">⤓ .liquid</button>
                </>
              )}
            </div>
          </div>

          {version && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b px-4 py-2 text-xs" style={{ borderColor: "var(--line)" }}>
              <span className="font-semibold">{version.section.name}</span>
              <span style={{ color: version.check.ok ? "var(--good)" : "var(--warn)" }}>
                {version.check.ok ? "✓ schema valid" : `⚠ ${version.check.issues.join(" · ")}`}
              </span>
              <span className="mono muted">{version.check.settings} settings · {version.check.blocks} block types</span>
              {current && current.versions.length > 1 && (
                <span className="ml-auto flex items-center gap-1">
                  {current.versions.map((_, i) => (
                    <button key={i} type="button" onClick={() => setVIdx(i)} className="mono rounded px-1.5 py-0.5 text-[10.5px]"
                      style={{ background: i === vIdx ? "rgba(34,211,238,.18)" : "transparent", color: i === vIdx ? "#a5f3fc" : "var(--muted)" }}>v{i + 1}</button>
                  ))}
                </span>
              )}
            </div>
          )}

          <div className="relative flex-1 overflow-auto" style={{ background: tab === "preview" ? "repeating-conic-gradient(rgba(255,255,255,.03) 0 25%, transparent 0 50%) 0 0/20px 20px" : "rgba(0,0,0,.35)" }}>
            {busy && (
              <div className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm" style={{ background: "rgba(4,5,10,.6)" }}>
                <div className="mono w-72 space-y-1.5 text-xs">
                  {STEPS.map((s, i) => (
                    <div key={s} className="flex items-center gap-2" style={{ color: i < step ? "var(--good)" : i === step ? "#fff" : "#3f4a63" }}>
                      <span className="w-4">{i < step ? "✓" : i === step ? "›" : "·"}</span>
                      <span className={i === step ? "caret" : ""}>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!version && !busy && (
              <div className="flex h-full min-h-[480px] flex-col items-center justify-center p-8 text-center">
                <div className="font-display text-6xl" style={{ color: "rgba(34,211,238,.25)" }}>{"{% %}"}</div>
                <p className="mt-4 font-medium">Your section will appear here</p>
                <p className="mt-1 max-w-sm text-sm muted">Pick a preset or describe what you want, set your brand style, and hit Generate.</p>
              </div>
            )}

            {version && tab === "preview" && (
              <div className="flex justify-center p-4 sm:p-6">
                <iframe
                  key={`${current?.id}-${vIdx}-${device}`}
                  title="Section preview"
                  sandbox=""
                  srcDoc={previewDoc(version.section.preview_html, current?.style.font ?? style.font)}
                  className="animate-fade-up rounded-lg bg-white shadow-2xl transition-all duration-500"
                  style={{ width: device === "desktop" ? "100%" : 390, height: device === "desktop" ? 560 : 720, border: 0 }}
                />
              </div>
            )}

            {version && tab === "code" && (
              <pre className="mono overflow-auto p-5 text-[12px] leading-relaxed" style={{ color: "#c7d2e6" }}>{version.section.liquid}</pre>
            )}

            {version && tab === "install" && (
              <div className="max-w-xl space-y-4 p-6 text-sm">
                <p className="font-display text-lg font-semibold">Add it to your Shopify store</p>
                <ol className="list-decimal space-y-2 pl-5 muted">
                  <li>In Shopify admin, go to <span className="text-white">Online Store → Themes</span>. Click <span className="text-white">⋯ → Duplicate</span> on your live theme to work safely on a copy.</li>
                  <li>On the copy, choose <span className="text-white">⋯ → Edit code</span>.</li>
                  <li>Under <span className="text-white">sections</span>, click <span className="text-white">Add a new section</span> and name it <span className="mono text-white">{slug(version.section.name)}</span>.</li>
                  <li>Replace the contents with the downloaded <span className="mono text-white">.liquid</span> file and click <span className="text-white">Save</span>.</li>
                  <li>Open <span className="text-white">Customize</span>, then <span className="text-white">Add section → {version.section.name}</span>. All its settings are editable there.</li>
                  <li>Preview it, then publish the copy when you&apos;re happy.</li>
                </ol>
                <p className="text-xs muted">Works with Online Store 2.0 themes, such as Dawn and most themes from 2021 onwards. The preview is an approximation, so always check in the theme editor.</p>
              </div>
            )}
          </div>

          {version && (
            <div className="border-t p-3" style={{ borderColor: "var(--line)" }}>
              <p className="mb-2 px-1 text-xs muted"><span style={{ color: "var(--good)" }}>{version.section.summary}</span></p>
              <form onSubmit={(e) => { e.preventDefault(); run(refine, true); }} className="flex gap-2">
                <input className="field flex-1 px-3.5 py-2.5 text-sm" maxLength={1500} value={refine} onChange={(e) => setRefine(e.target.value)}
                  placeholder="Refine: “make the heading bigger”, “add a third button”, “dark background”…" />
                <button type="submit" disabled={busy || refine.trim().length < 3} className="btn-primary rounded-xl px-4 text-sm disabled:opacity-40">
                  Refine · {costLabel.split(" · ")[0]}
                </button>
              </form>
            </div>
          )}
        </div>
      </section>

      <ChatWidget />
    </main>
  );
}
