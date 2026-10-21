"use client";

import { useCallback, useEffect, useState } from "react";
import type { PublicWallet } from "./pricing";

const EVENT = "losslens:wallet";

// Any API response that changes the balance includes `wallet`; broadcast it so
// every component showing the balance updates.
export function emitWallet(w: PublicWallet | undefined | null) {
  if (w) window.dispatchEvent(new CustomEvent(EVENT, { detail: w }));
}

export function useWallet() {
  const [wallet, setWallet] = useState<PublicWallet | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/wallet", { cache: "no-store" });
      if (res.ok) setWallet(await res.json());
    } catch { /* offline */ }
  }, []);

  useEffect(() => {
    refresh();
    const on = (e: Event) => setWallet((e as CustomEvent<PublicWallet>).detail);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, [refresh]);

  const topUp = useCallback(async (): Promise<string | null> => {
    const res = await fetch("/api/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "topup" }),
    });
    const json = await res.json().catch(() => null);
    if (res.ok) { emitWallet(json); return null; }
    if (json?.wallet) emitWallet(json.wallet);
    return json?.error ?? "Couldn't add tokens.";
  }, []);

  return { wallet, refresh, topUp };
}
