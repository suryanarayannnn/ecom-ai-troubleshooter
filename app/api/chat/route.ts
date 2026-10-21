import { chatSystem, fallbackAnswer } from "@/lib/chatKnowledge";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

// Any OpenAI-compatible chat endpoint works. Defaults to Google's free Gemini tier.
const BASE = process.env.CHAT_API_BASE || "https://generativelanguage.googleapis.com/v1beta/openai";
const MODEL = process.env.CHAT_MODEL || "gemini-3.5-flash-lite";
const KEY = process.env.GEMINI_API_KEY || process.env.CHAT_API_KEY;

type Msg = { role: "user" | "assistant"; content: string };

const text = (s: string, status = 200) =>
  new Response(s, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "X-Lens-Mode": "offline" } });

export async function POST(req: Request) {
  let messages: Msg[];
  try {
    const body = await req.json();
    messages = (Array.isArray(body?.messages) ? body.messages : [])
      .filter((m: Msg) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string")
      .slice(-12)
      .map((m: Msg) => ({ role: m.role, content: m.content.slice(0, 2000) }));
  } catch {
    return text("Invalid request.", 400);
  }
  const last = messages.at(-1);
  if (!last || last.role !== "user" || !last.content.trim()) return text("Ask me something!", 400);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  if (!rateLimit(`chat:${ip}`, 30, 10 * 60 * 1000).ok) {
    return text("You're sending messages quickly. Give it a minute and try again.", 429);
  }

  if (!KEY) return text(fallbackAnswer(last.content));

  let upstream: Response;
  try {
    upstream = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        max_tokens: 1200,
        temperature: 0.3,
        messages: [{ role: "system", content: chatSystem() }, ...messages],
      }),
    });
  } catch {
    return text(fallbackAnswer(last.content));
  }
  if (!upstream.ok || !upstream.body) {
    console.error("chat upstream", upstream.status, await upstream.text().catch(() => ""));
    return text(fallbackAnswer(last.content));
  }

  // Convert the SSE stream into a plain text stream for the widget.
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buf = "";
  const stream = upstream.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buf += decoder.decode(chunk, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const payload = t.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const delta = JSON.parse(payload)?.choices?.[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(delta));
          } catch { /* partial or keep-alive line */ }
        }
      },
    }),
  );

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache", "X-Lens-Mode": "ai" },
  });
}
