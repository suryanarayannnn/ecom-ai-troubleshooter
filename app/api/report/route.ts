import { NextResponse, type NextRequest } from "next/server";
import { AnalysisSchema } from "@/lib/schema";
import { runEngine, type EngineResult } from "@/lib/engine";
import { FEATURES } from "@/lib/features";
import { buildReportHtml, generateReportContent } from "@/lib/fullReport";
import { LLMError } from "@/lib/llm";
import { PRICING } from "@/lib/pricing";
import { rateLimit } from "@/lib/rateLimit";
import { publicWallet, readWallet, writeWallet } from "@/lib/wallet";

export const runtime = "nodejs";
export const maxDuration = 300;

// Builds the Diagnose → Strategy → Action report for a finished diagnosis.
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  if (!rateLimit(`report:${ip}`, 4, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many reports. Try again in a few minutes." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const data = typeof body?.data === "string" ? body.data.slice(0, 60_000) : "";
  const parsed = AnalysisSchema.safeParse(body?.analysis);
  if (data.length < 50 || !parsed.success) {
    return NextResponse.json({ error: "Run a diagnosis first, then generate the full report." }, { status: 400 });
  }

  const wallet = FEATURES.tokens ? readWallet(req) : null;
  const cost = PRICING.cost.fullReport;
  if (wallet && wallet.bal < cost) {
    return writeWallet(NextResponse.json({ error: `The full report needs ${cost} tokens and you have ${wallet.bal}.`, code: "NO_TOKENS", wallet: publicWallet(wallet) }, { status: 402 }), wallet);
  }

  // Numbers are recomputed on the server, never taken from the browser.
  const requestedWeek = data.match(/Loss week to diagnose:\s*(.+)/i)?.[1]?.trim();
  let engine: EngineResult;
  try { engine = runEngine(data, requestedWeek); } catch { engine = { ok: false, reason: "The calculation engine hit an unexpected table format.", trace: [] }; }

  try {
    const content = await generateReportContent(data, engine, parsed.data);
    const html = buildReportHtml(content, engine, parsed.data);
    const res = NextResponse.json({ html, wallet: wallet ? publicWallet({ ...wallet, bal: wallet.bal - cost }) : null });
    if (!wallet) return res;
    wallet.bal -= cost;
    return writeWallet(res, wallet);
  } catch (err) {
    if (err instanceof LLMError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
