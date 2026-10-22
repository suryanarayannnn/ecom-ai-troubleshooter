import { chatSystem, fallbackAnswer } from "@/lib/chatKnowledge";
import { AI, authHeaders, postWithRetry } from "@/lib/llm";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

type Msg = { role: "user" | "assistant"; content: string };

const text = (s: string, mode: "ai" | "offline", status = 200) =>
  new Response(s, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "X-Lens-Mode": mode } });

export async function POST(req: Request) {
  let messages: Msg[];
  try {
    const body = await req.json();
    messages = (Array.isArray(body?.messages) ? body.messages : [])
      .filter((m: Msg) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string")
      .slice(-12)
      .map((m: Msg) => ({ role: m.role, content: m.content.slice(0, 2000) }));
  } catch {
    return text("Invalid request.", "offline", 400);
  }
  const last = messages.at(-1);
  if (!last || last.role !== "user" || !last.content.trim()) return text("Ask me something!", "offline", 400);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  if (!rateLimit(`chat:${ip}`, 30, 10 * 60 * 1000).ok) {
    return text("You're sending messages quickly. Give it a minute and try again.", "offline", 429);
  }

  const payload = {
    model: AI.models.chat,
    max_tokens: 1200,
    temperature: 0.3,
    messages: [{ role: "system", content: chatSystem() }, ...messages],
  };

  // Keyless provider: one plain request, waiting once if the free tier asks us to.
  if (AI.provider === "pollinations") {
    try {
      const res = await postWithRetry(AI.base, payload, 2);
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      const answer: string = json?.choices?.[0]?.message?.content ?? "";
      return answer.trim() ? text(answer, "ai") : text(fallbackAnswer(last.content), "offline");
    } catch (e) {
      console.error("chat pollinations", e);
      return text(fallbackAnswer(last.content), "offline");
    }
  }

  // Keyed providers: stream the reply.
  let upstream: Response;
  try {
    upstream = await fetch(`${AI.base}/chat/completions`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ ...payload, stream: true }),
    });
  } catch {
    return text(fallbackAnswer(last.content), "offline");
  }
  if (!upstream.ok || !upstream.body) {
    console.error("chat upstream", upstream.status, await upstream.text().catch(() => ""));
    return text(fallbackAnswer(last.content), "offline");
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
          const data = t.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const delta = JSON.parse(data)?.choices?.[0]?.delta?.content;
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
