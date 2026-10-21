// Stateless token wallet: the balance lives in an HMAC-signed, httpOnly cookie,
// so visitors can't edit it. Clearing cookies resets to the starting grant,
// which is acceptable for demo tokens. Real payments need accounts.
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { PRICING, type PublicWallet } from "./pricing";

export type Wallet = { v: 1; id: string; bal: number; day: string; free: number; topup: number };

const COOKIE = "ll_wallet";
const today = () => new Date().toISOString().slice(0, 10);

function secret() {
  return process.env.WALLET_SECRET
    || createHash("sha256").update(`losslens-wallet:${process.env.GEMINI_API_KEY ?? process.env.CHAT_API_KEY ?? ""}`).digest("hex");
}
const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function readWallet(req: NextRequest): Wallet {
  let w: Wallet | null = null;
  const raw = req.cookies.get(COOKIE)?.value;
  if (raw) {
    const [p, s] = raw.split(".");
    const expected = p ? sign(p) : "";
    if (p && s && s.length === expected.length && timingSafeEqual(Buffer.from(s), Buffer.from(expected))) {
      try { w = JSON.parse(Buffer.from(p, "base64url").toString("utf8")); } catch { w = null; }
    }
  }
  if (!w || w.v !== 1) w = { v: 1, id: randomUUID(), bal: PRICING.startTokens, day: today(), free: 0, topup: Date.now() };
  if (w.day !== today()) { w.day = today(); w.free = 0; }
  return w;
}

export function writeWallet<T extends NextResponse>(res: T, w: Wallet): T {
  const p = Buffer.from(JSON.stringify(w)).toString("base64url");
  res.cookies.set(COOKIE, `${p}.${sign(p)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}

export function publicWallet(w: Wallet): PublicWallet {
  const next = w.topup + PRICING.topupCooldownMs;
  return {
    balance: w.bal,
    freeThemeLeft: Math.max(0, PRICING.freeThemePerDay - w.free),
    canTopUp: Date.now() >= next,
    nextTopUpAt: Date.now() >= next ? null : next,
  };
}
