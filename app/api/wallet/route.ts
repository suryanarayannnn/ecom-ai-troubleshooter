import { NextResponse, type NextRequest } from "next/server";
import { FEATURES } from "@/lib/features";
import { PRICING } from "@/lib/pricing";
import { publicWallet, readWallet, writeWallet } from "@/lib/wallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const off = () => NextResponse.json({ error: "Tokens are turned off." }, { status: 404 });

export async function GET(req: NextRequest) {
  if (!FEATURES.tokens) return off();
  const w = readWallet(req);
  return writeWallet(NextResponse.json(publicWallet(w)), w);
}

// Demo top-up: free tokens once per cooldown window. No payment is taken.
export async function POST(req: NextRequest) {
  if (!FEATURES.tokens) return off();
  const w = readWallet(req);
  const body = await req.json().catch(() => ({}));
  if (body?.action !== "topup") return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  if (Date.now() - w.topup < PRICING.topupCooldownMs) {
    return writeWallet(NextResponse.json({ error: "Demo tokens can be claimed once a day.", wallet: publicWallet(w) }, { status: 429 }), w);
  }
  w.bal += PRICING.topupTokens;
  w.topup = Date.now();
  return writeWallet(NextResponse.json(publicWallet(w)), w);
}
