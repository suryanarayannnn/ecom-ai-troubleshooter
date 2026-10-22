import { NextResponse, type NextRequest } from "next/server";
import { AnalysisSchema } from "@/lib/schema";
import { FEATURES } from "@/lib/features";
import { PRICING } from "@/lib/pricing";
import { publicWallet, readWallet, writeWallet, type Wallet } from "@/lib/wallet";
import { getSystemPrompt } from "@/lib/systemPrompt";
import { rateLimit } from "@/lib/rateLimit";
import { engineForPrompt, runEngine, type EngineResult } from "@/lib/engine";
import { verify } from "@/lib/verify";
import { AI, generateJSON, LLMError } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 300; // the reasoning step can take a minute or two

const MAX_INPUT_CHARS = 60_000;

// Charges the run when the token system is on; otherwise passes the response through.
function settle(res: NextResponse, w: Wallet | null) {
  if (!w) return res;
  w.bal -= PRICING.cost.troubleshoot;
  return writeWallet(res, w);
}

export async function POST(req: NextRequest) {
  if (!AI.ready) {
    return NextResponse.json(
      { error: AI.missingKeyMessage },
      { status: 500 },
    );
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  const limit = rateLimit(ip);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Rate limit reached. Try again in ${Math.ceil(limit.retryAfterSec / 60)} min.` },
      { status: 429 },
    );
  }

  let data: string;
  try {
    const body = await req.json();
    data = typeof body?.data === "string" ? body.data.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (data.length < 50) {
    return NextResponse.json({ error: "Add more data. At minimum, include the weekly PnL." }, { status: 400 });
  }
  if (data.length > MAX_INPUT_CHARS) {
    return NextResponse.json(
      { error: `Input is ${data.length.toLocaleString()} characters; the limit is ${MAX_INPUT_CHARS.toLocaleString()}. Trim older weeks or less relevant breakdowns.` },
      { status: 413 },
    );
  }

  const wallet = FEATURES.tokens ? readWallet(req) : null;
  if (wallet && wallet.bal < PRICING.cost.troubleshoot) {
    return writeWallet(NextResponse.json(
      { error: `A troubleshoot run needs ${PRICING.cost.troubleshoot} tokens and you have ${wallet.bal}.`, code: "NO_TOKENS", wallet: publicWallet(wallet) },
      { status: 402 },
    ), wallet);
  }
  const after = () => (wallet ? publicWallet({ ...wallet, bal: wallet.bal - PRICING.cost.troubleshoot }) : null);

  // Layer 1: deterministic calculation
  const requestedWeek = data.match(/Loss week to diagnose:\s*(.+)/i)?.[1]?.trim();
  let engine: EngineResult;
  try {
    engine = runEngine(data, requestedWeek);
  } catch (e) {
    console.error("engine failed", e);
    engine = { ok: false, reason: "The calculation engine hit an unexpected table format.", trace: [] };
  }

  // Layer 2: reasoning (free AI model)
  try {
    const output = await generateJSON({
      model: AI.models.analyze,
      maxTokens: 32000,
      system: getSystemPrompt(),
      schema: AnalysisSchema,
      user: [
        "Run the full troubleshooting method on the store data below.",
        "",
        "<engine_output>",
        "Computed in code from the PnL. These figures are authoritative: use them exactly for Steps 1–2 and do not recompute them.",
        engineForPrompt(engine),
        "</engine_output>",
        "",
        `<seller_data>\n${data}\n</seller_data>`,
      ].join("\n"),
    });

    // Layer 3: verification
    try {
      const { analysis, checks } = verify(output, engine);
      return settle(NextResponse.json({ analysis, engine, checks, wallet: after() }), wallet);
    } catch (e) {
      console.error("verifier failed", e);
      return settle(NextResponse.json({
        analysis: output,
        engine,
        checks: [{ label: "Verifier", status: "warn", detail: "The verifier could not run on this output. Numbers are unverified." }],
        wallet: after(),
      }), wallet);
    }
  } catch (err) {
    if (err instanceof LLMError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
