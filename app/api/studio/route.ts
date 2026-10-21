import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse, type NextRequest } from "next/server";
import { FEATURES } from "@/lib/features";
import { PRICING } from "@/lib/pricing";
import { rateLimit } from "@/lib/rateLimit";
import { publicWallet, readWallet, writeWallet } from "@/lib/wallet";
import {
  SectionSchema, THEME_SYSTEM, buildThemeUserMessage, checkSection,
  type BrandStyle, type GeneratedSection,
} from "@/lib/theme";

export const runtime = "nodejs";
export const maxDuration = 300;

const GEMINI_BASE = process.env.CHAT_API_BASE || "https://generativelanguage.googleapis.com/v1beta/openai";
const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.CHAT_API_KEY;
const FREE_MODEL = process.env.THEME_FREE_MODEL || "gemini-3.8-flash";
const PRO_MODEL = process.env.THEME_PRO_MODEL || "claude-opus-5-5";

class GenError extends Error {}

async function generateStandard(user: string): Promise<GeneratedSection> {
  const res = await fetch(`${GEMINI_BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${GEMINI_KEY}` },
    body: JSON.stringify({
      model: FREE_MODEL,
      temperature: 0.4,
      max_tokens: 16000,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "section",
          schema: {
            type: "object",
            properties: {
              name: { type: "string" }, summary: { type: "string" },
              liquid: { type: "string" }, preview_html: { type: "string" },
            },
            required: ["name", "summary", "liquid", "preview_html"],
          },
        },
      },
      messages: [{ role: "system", content: THEME_SYSTEM }, { role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    console.error("studio gemini", res.status, await res.text().catch(() => ""));
    throw new GenError(res.status === 429 ? "The free model is busy right now. Try again in a minute, or use Pro." : "The free model couldn't generate this section.");
  }
  const json = await res.json();
  const raw: string = json?.choices?.[0]?.message?.content ?? "";
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const parsed = SectionSchema.safeParse((() => { try { return JSON.parse(cleaned); } catch { return null; } })());
  if (!parsed.success) throw new GenError("The free model returned an incomplete section. Try again, or use Pro.");
  return parsed.data;
}

async function generatePro(user: string): Promise<GeneratedSection> {
  const client = new Anthropic();
  const response = await client.messages.parse({
    model: PRO_MODEL,
    max_tokens: 16000,
    system: THEME_SYSTEM,
    output_config: { effort: "medium", format: zodOutputFormat(SectionSchema) },
    messages: [{ role: "user", content: user }],
  });
  if (response.stop_reason === "refusal") throw new GenError("The model declined this request.");
  if (response.stop_reason === "max_tokens" || !response.parsed_output) throw new GenError("The section was too large to finish. Try a simpler request.");
  return response.parsed_output;
}

export async function POST(req: NextRequest) {
  if (!FEATURES.studio) return NextResponse.json({ error: "Section Studio is turned off." }, { status: 404 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  const limit = rateLimit(`studio:${ip}`, FEATURES.tokens ? 15 : 8, 10 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: "Too many generations. Take a short break and try again." }, { status: 429 });

  const body = await req.json().catch(() => null);
  // Without the token system there is no way to pay for Pro, so everyone gets Standard.
  const tier: "standard" | "pro" = body?.tier === "pro" && FEATURES.tokens ? "pro" : "standard";
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim().slice(0, 1500) : "";
  const style = body?.style as BrandStyle | undefined;
  const previous = body?.previous && typeof body.previous.liquid === "string" && typeof body.previous.preview_html === "string"
    ? { liquid: body.previous.liquid.slice(0, 40_000), preview_html: body.previous.preview_html.slice(0, 40_000) }
    : undefined;
  if (prompt.length < 5 || !style) return NextResponse.json({ error: "Describe the section you want." }, { status: 400 });

  // Pricing
  const w = readWallet(req);
  const useFree = tier === "standard" && w.free < PRICING.freeThemePerDay;
  const cost = !FEATURES.tokens ? 0 : tier === "pro" ? PRICING.cost.themePro : useFree ? 0 : PRICING.cost.themeStandard;
  if (w.bal < cost) {
    return writeWallet(NextResponse.json({ error: `This needs ${cost} tokens and you have ${w.bal}.`, code: "NO_TOKENS", wallet: publicWallet(w) }, { status: 402 }), w);
  }

  // Standard runs on the free Gemini tier when configured; otherwise it falls back to Claude.
  const engine = tier === "standard" && GEMINI_KEY ? "standard" : "pro";
  if (engine === "pro" && !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "No AI model is configured on the server yet (add GEMINI_API_KEY or ANTHROPIC_API_KEY in Vercel)." }, { status: 503 });
  }

  try {
    const user = buildThemeUserMessage(prompt, style, previous);
    const section = engine === "standard" ? await generateStandard(user) : await generatePro(user);
    const check = checkSection(section.liquid);

    if (useFree) w.free += 1;
    w.bal -= cost;
    return writeWallet(NextResponse.json({
      section,
      check,
      charged: cost,
      model: engine === "standard" ? FREE_MODEL : PRO_MODEL,
      wallet: publicWallet(w),
    }), w);
  } catch (err) {
    if (err instanceof GenError) return NextResponse.json({ error: err.message }, { status: 502 });
    if (err instanceof Anthropic.RateLimitError) return NextResponse.json({ error: "The AI service is busy. Please retry in a minute." }, { status: 429 });
    if (err instanceof Anthropic.APIError) return NextResponse.json({ error: `AI service error (${err.status}).` }, { status: 502 });
    console.error(err);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
