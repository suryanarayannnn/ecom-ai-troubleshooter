import { NextResponse, type NextRequest } from "next/server";
import { FEATURES } from "@/lib/features";
import { AI, generateJSON, KEYLESS, LLMError } from "@/lib/llm";
import { sectionKeyless } from "@/lib/keyless";
import { PRICING } from "@/lib/pricing";
import { rateLimit } from "@/lib/rateLimit";
import { publicWallet, readWallet, writeWallet } from "@/lib/wallet";
import { SectionSchema, THEME_SYSTEM, buildThemeUserMessage, checkSection, type BrandStyle } from "@/lib/theme";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  if (!FEATURES.studio) return NextResponse.json({ error: "Section Studio is turned off." }, { status: 404 });
  if (!AI.ready) return NextResponse.json({ error: AI.missingKeyMessage }, { status: 503 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  const limit = rateLimit(`studio:${ip}`, 12, 10 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: "Too many generations. Take a short break and try again." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const tier: "standard" | "pro" = body?.tier === "pro" ? "pro" : "standard";
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim().slice(0, 1500) : "";
  const style = body?.style as BrandStyle | undefined;
  const previous = body?.previous && typeof body.previous.liquid === "string" && typeof body.previous.preview_html === "string"
    ? { liquid: body.previous.liquid.slice(0, 40_000), preview_html: body.previous.preview_html.slice(0, 40_000) }
    : undefined;
  if (prompt.length < 5 || !style) return NextResponse.json({ error: "Describe the section you want." }, { status: 400 });

  // Pricing (demo tokens)
  const w = readWallet(req);
  const useFree = tier === "standard" && w.free < PRICING.freeThemePerDay;
  const cost = !FEATURES.tokens ? 0 : tier === "pro" ? PRICING.cost.themePro : useFree ? 0 : PRICING.cost.themeStandard;
  if (w.bal < cost) {
    return writeWallet(NextResponse.json({ error: `This needs ${cost} tokens and you have ${w.bal}.`, code: "NO_TOKENS", wallet: publicWallet(w) }, { status: 402 }), w);
  }

  const model = tier === "pro" ? AI.models.themePro : AI.models.themeStandard;
  try {
    const section = KEYLESS ? await sectionKeyless(prompt, style, model, previous) : await generateJSON({
      model,
      maxTokens: 24000,
      system: THEME_SYSTEM,
      schema: SectionSchema,
      user: buildThemeUserMessage(prompt, style, previous),
    });
    const check = checkSection(section.liquid);

    if (useFree) w.free += 1;
    w.bal -= cost;
    return writeWallet(NextResponse.json({ section, check, charged: cost, model, wallet: publicWallet(w) }), w);
  } catch (err) {
    if (err instanceof LLMError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
