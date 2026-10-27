// Feature switches. Toggle in Vercel → Settings → Environment Variables, then redeploy.
//
//   NEXT_PUBLIC_FEATURE_STUDIO  Section Studio page, its API, and its nav/home links.
//                               On unless set to "off".
//   NEXT_PUBLIC_FEATURE_TOKENS  Token wallet, pricing page and per-use charging.
//                               OFF unless set to "on": everything is free by default
//                               (per-visitor rate limits still apply).
const flag = (v: string | undefined, fallback: boolean) => {
  const s = (v ?? "").trim().toLowerCase();
  if (/^(on|true|1|yes)$/.test(s)) return true;
  if (/^(off|false|0|no)$/.test(s)) return false;
  return fallback;
};

export const FEATURES = {
  studio: flag(process.env.NEXT_PUBLIC_FEATURE_STUDIO, true),
  tokens: flag(process.env.NEXT_PUBLIC_FEATURE_TOKENS, false),
} as const;
