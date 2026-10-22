// Single AI gateway for the site. Every provider is free and OpenAI-compatible.
// Picked automatically, in order:
//   1. CHAT_API_BASE (+ CHAT_API_KEY): any provider you configure
//   2. GEMINI_API_KEY: Google's free Gemini tier
//   3. nothing set: Pollinations.ai anonymous tier, no key or signup
//      (open-source GPT-OSS 20B, about 1 reply per 30 s per server IP)
import { z } from "zod";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const PROVIDER: "custom" | "gemini" | "pollinations" = process.env.CHAT_API_BASE ? "custom" : GEMINI_KEY ? "gemini" : "pollinations";

const BASE = PROVIDER === "custom" ? process.env.CHAT_API_BASE!
  : PROVIDER === "gemini" ? "https://generativelanguage.googleapis.com/v1beta/openai"
  : "https://text.pollinations.ai/openai";
const KEY = PROVIDER === "custom" ? process.env.CHAT_API_KEY : PROVIDER === "gemini" ? GEMINI_KEY : undefined;

const defaults = PROVIDER === "pollinations"
  ? { analyze: "openai", themeStandard: "openai", themePro: "openai", chat: "openai" }
  : { analyze: "gemini-3.8-flash", themeStandard: "gemini-3.5-flash-lite", themePro: "gemini-3.8-flash", chat: "gemini-3.5-flash-lite" };

export const AI = {
  provider: PROVIDER,
  label: PROVIDER === "gemini" ? "Google Gemini (free tier)" : PROVIDER === "pollinations" ? "Pollinations GPT-OSS (free, no key)" : "custom model",
  ready: PROVIDER !== "custom" || Boolean(BASE),
  base: BASE,
  models: {
    analyze: process.env.ANALYZE_MODEL || defaults.analyze,
    themeStandard: process.env.THEME_FREE_MODEL || defaults.themeStandard,
    themePro: process.env.THEME_PRO_MODEL || defaults.themePro,
    chat: process.env.CHAT_MODEL || defaults.chat,
  },
  missingKeyMessage: "The AI isn't configured on the server.",
};

export function authHeaders(): Record<string, string> {
  return KEY ? { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` } : { "Content-Type": "application/json" };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// POST with automatic waiting when a free tier says "slow down" (Pollinations: 1 reply / 30 s).
export async function postWithRetry(url: string, body: unknown, tries = 3): Promise<Response> {
  for (let i = 0; ; i++) {
    const res = await fetch(url, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) });
    if (res.status !== 429 || i >= tries - 1) return res;
    const msg = await res.text().catch(() => "");
    const wait = Number(msg.match(/wait\s+(\d+)\s*second/i)?.[1] ?? res.headers.get("retry-after") ?? 30);
    await sleep(Math.min(Math.max(wait, 2), 35) * 1000 + 500);
  }
}

export class LLMError extends Error {
  constructor(message: string, public status = 502) { super(message); }
}

type Msg = { role: "system" | "user" | "assistant"; content: string };

async function complete(model: string, messages: Msg[], maxTokens: number, jsonMode: boolean): Promise<string> {
  const body: Record<string, unknown> = { model, messages, max_tokens: maxTokens, temperature: 0.3 };
  if (jsonMode) body.response_format = { type: "json_object" };

  const url = PROVIDER === "pollinations" ? BASE : `${BASE}/chat/completions`;
  let res = await postWithRetry(url, body);
  // Some models reject JSON mode; retry once without it (the prompt still asks for JSON).
  if (res.status === 400 && jsonMode) {
    delete body.response_format;
    res = await postWithRetry(url, body);
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("llm", model, res.status, detail.slice(0, 500));
    if (res.status === 429) throw new LLMError("The free AI model is busy (shared rate limit). Please try again in a minute.", 429);
    if (res.status === 401 || res.status === 403) throw new LLMError("The AI provider rejected the server's key.", 500);
    if (res.status === 404) throw new LLMError(`The model "${model}" isn't available on this key.`, 502);
    throw new LLMError(`AI service error (${res.status}).`, 502);
  }
  const json = await res.json();
  return json?.choices?.[0]?.message?.content ?? "";
}

function extractJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try { return JSON.parse(t); } catch { /* fall through */ }
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch { /* fall through */ } }
  return null;
}

// Asks for JSON matching `schema`, validates it, and gives the model one chance to fix mistakes.
export async function generateJSON<T>(opts: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  model: string;
  maxTokens: number;
}): Promise<T> {
  if (!AI.ready) throw new LLMError(AI.missingKeyMessage, 503);

  const schemaText = JSON.stringify(z.toJSONSchema(opts.schema));
  const messages: Msg[] = [
    { role: "system", content: `${opts.system}\n\n## Output format\nRespond with ONE JSON object only (no markdown fences, no commentary) that validates against this JSON Schema. Use null where a value is unknown.\n${schemaText}` },
    { role: "user", content: opts.user },
  ];

  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await complete(opts.model, messages, opts.maxTokens, true);
    const parsed = opts.schema.safeParse(extractJson(text));
    if (parsed.success) return parsed.data;
    const issues = parsed.error.issues.slice(0, 8).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
    messages.push({ role: "assistant", content: text.slice(0, 20_000) });
    messages.push({ role: "user", content: `That response didn't match the schema (${issues || "not valid JSON"}). Return the complete corrected JSON object only.` });
  }
  throw new LLMError("The AI returned an incomplete answer. Please try again.", 502);
}
