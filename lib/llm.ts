// Single AI gateway for the site. Everything runs on Google's free Gemini tier
// through its OpenAI-compatible endpoint, so no paid account is ever billed.
// Any other OpenAI-compatible provider works by setting CHAT_API_BASE / CHAT_API_KEY.
import { z } from "zod";

const BASE = process.env.CHAT_API_BASE || "https://generativelanguage.googleapis.com/v1beta/openai";
const KEY = process.env.GEMINI_API_KEY || process.env.CHAT_API_KEY;

export const AI = {
  ready: Boolean(KEY),
  models: {
    analyze: process.env.ANALYZE_MODEL || "gemini-3.8-flash",
    themeStandard: process.env.THEME_FREE_MODEL || "gemini-3.5-flash-lite",
    themePro: process.env.THEME_PRO_MODEL || "gemini-3.8-flash",
  },
  missingKeyMessage: "The AI isn't connected yet. Add a free GEMINI_API_KEY (aistudio.google.com/apikey) in Vercel → Settings → Environment Variables, then redeploy.",
};

export class LLMError extends Error {
  constructor(message: string, public status = 502) { super(message); }
}

type Msg = { role: "system" | "user" | "assistant"; content: string };

async function complete(model: string, messages: Msg[], maxTokens: number, jsonMode: boolean): Promise<string> {
  const body: Record<string, unknown> = { model, messages, max_tokens: maxTokens, temperature: 0.3 };
  if (jsonMode) body.response_format = { type: "json_object" };

  let res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify(body),
  });
  // Some models reject JSON mode; retry once without it (the prompt still asks for JSON).
  if (res.status === 400 && jsonMode) {
    delete body.response_format;
    res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify(body),
    });
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("llm", model, res.status, detail.slice(0, 500));
    if (res.status === 429) throw new LLMError("The free AI model has hit its rate limit. Please try again in a minute.", 429);
    if (res.status === 401 || res.status === 403) throw new LLMError("The GEMINI_API_KEY on the server is invalid.", 500);
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
  if (!KEY) throw new LLMError(AI.missingKeyMessage, 503);

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
