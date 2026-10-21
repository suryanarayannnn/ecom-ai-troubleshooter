"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { FEATURES } from "@/lib/features";

type Msg = { role: "user" | "assistant"; content: string };

const STORE_KEY = "losslens-chat";
const GREETING: Msg = {
  role: "assistant",
  content: "Hi, I'm **Lens**. Ask me how to use LossLens, what a metric means, or where to find something on the site.",
};
const SUGGESTIONS = [
  "How do I use this?",
  "What data do I need?",
  ...(FEATURES.studio ? ["How do I build a Shopify section?"] : []),
  ...(FEATURES.tokens ? ["How do tokens work?"] : []),
  "What is RTO?",
  "Show me a sample case",
  "Does the AI make up numbers?",
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"ai" | "offline" | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Restore / persist this tab's conversation
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORE_KEY);
      if (saved) setMsgs(JSON.parse(saved));
    } catch { /* storage unavailable */ }
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(msgs.slice(-30))); } catch { /* ignore */ }
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 150); }, [open]);

  function go(href: string) {
    const onHome = window.location.pathname === "/";
    if (href.startsWith("/")) {
      window.location.href = href; // another page (Studio, Pricing)
    } else if (href.startsWith("#case-")) {
      if (onHome) window.dispatchEvent(new CustomEvent("losslens:load-case", { detail: href.slice(6) }));
      else window.location.href = `/#cases`;
    } else {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: "smooth" });
      else window.location.href = `/${href}`; // section lives on the home page
    }
    if (window.innerWidth < 640) setOpen(false);
  }

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: q }];
    setMsgs([...next, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Drop the canned greeting so the conversation starts with the user.
        body: JSON.stringify({ messages: next.filter((m, i) => !(i === 0 && m.role === "assistant")) }),
      });
      setMode(res.headers.get("X-Lens-Mode") === "ai" ? "ai" : "offline");
      if (!res.body) throw new Error();
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMsgs([...next, { role: "assistant", content: acc }]);
      }
      if (!acc.trim()) {
        setMsgs([...next, { role: "assistant", content: "I couldn't come up with an answer for that. Try rephrasing, or check the [FAQ](#faq)." }]);
      }
    } catch {
      setMsgs([...next, { role: "assistant", content: "I'm having trouble connecting. Try again in a moment, or check the [FAQ](#faq)." }]);
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    setMsgs([GREETING]);
    try { sessionStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
  }

  const showSuggestions = msgs.length <= 1;

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close assistant" : "Open assistant"}
        className="fixed bottom-5 right-5 z-[60] flex h-14 items-center gap-2 rounded-full pl-4 pr-5 text-sm font-semibold transition-transform hover:scale-105"
        style={{ background: "var(--grad)", color: "var(--on-grad)", boxShadow: "0 10px 40px -8px color-mix(in srgb, var(--cyan) 70%, transparent)" }}
      >
        <span className="relative flex h-6 w-6 items-center justify-center">
          {!open && <span className="pulse-dot absolute inset-0 rounded-full" />}
          <span className="text-lg leading-none">{open ? "✕" : "◎"}</span>
        </span>
        <span className="hidden sm:inline">{open ? "Close" : "Ask Lens"}</span>
      </button>

      {/* Panel */}
      <div
        className="fixed bottom-24 right-3 z-[60] flex w-[calc(100vw-24px)] max-w-[400px] flex-col overflow-hidden rounded-2xl border transition-all duration-300 sm:right-5"
        style={{
          height: "min(600px, calc(100vh - 130px))",
          borderColor: "color-mix(in srgb, var(--cyan) 35%, transparent)",
          background: "var(--panel)",
          backdropFilter: "blur(18px)",
          boxShadow: "0 30px 80px -20px var(--well), 0 0 60px -20px color-mix(in srgb, var(--cyan) 35%, transparent)",
          opacity: open ? 1 : 0,
          transform: open ? "none" : "translateY(16px) scale(.97)",
          pointerEvents: open ? "auto" : "none",
        }}
        role="dialog"
        aria-label="LossLens assistant"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--line)" }}>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl text-lg" style={{ background: "var(--grad)", color: "var(--on-grad)" }}>◎</span>
            <div>
              <p className="font-display font-semibold leading-tight">Lens</p>
              <p className="label" style={{ fontSize: 9.5, color: mode === "offline" ? "var(--warn)" : "var(--good)" }}>
                ● {mode === "offline" ? "quick answers mode" : "site assistant · free AI"}
              </p>
            </div>
          </div>
          <button type="button" onClick={clear} className="mono text-[11px] muted hover-ink">reset</button>
        </div>

        {/* Messages */}
        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
                style={m.role === "user"
                  ? { background: "linear-gradient(135deg, color-mix(in srgb, var(--cyan) 22%, transparent), color-mix(in srgb, var(--violet) 25%, transparent))", border: "1px solid color-mix(in srgb, var(--cyan) 35%, transparent)" }
                  : { background: "color-mix(in srgb, var(--ink) 4%, transparent)", border: "1px solid var(--line)" }}
              >
                {m.content ? (
                  <div className="chat-md">
                    <ReactMarkdown
                      components={{
                        a: ({ href = "", children }) =>
                          href.startsWith("#") || href.startsWith("/") ? (
                            <button type="button" onClick={() => go(href)} className="mx-0.5 inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium" style={{ background: "color-mix(in srgb, var(--cyan) 12%, transparent)", color: "var(--accent-ink)", border: "1px solid color-mix(in srgb, var(--cyan) 35%, transparent)" }}>
                              {children} ↘
                            </button>
                          ) : (
                            <a href={href} target="_blank" rel="noreferrer" className="underline" style={{ color: "var(--accent-ink)" }}>{children}</a>
                          ),
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <span className="flex gap-1 py-1">
                    {[0, 1, 2].map((d) => (
                      <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full" style={{ background: "var(--cyan)", animationDelay: `${d * 120}ms` }} />
                    ))}
                  </span>
                )}
              </div>
            </div>
          ))}

          {showSuggestions && (
            <div className="flex flex-wrap gap-2 pt-1">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} className="chip px-3 py-1.5 text-xs">{s}</button>
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="flex items-center gap-2 border-t p-3"
          style={{ borderColor: "var(--line)" }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={2000}
            placeholder="Ask about the site, metrics, or how to start…"
            className="field flex-1 px-3.5 py-2.5 text-sm"
          />
          <button type="submit" disabled={busy || !input.trim()} className="btn-primary flex h-10 w-10 items-center justify-center rounded-xl text-base disabled:opacity-40" aria-label="Send">
            ➤
          </button>
        </form>
      </div>
    </>
  );
}
