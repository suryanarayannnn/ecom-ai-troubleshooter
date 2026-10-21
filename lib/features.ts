// Feature switches. Toggle in Vercel → Settings → Environment Variables, then redeploy.
// "off" (or "false" / "0") disables a feature; anything else, or unset, leaves it on.
//
//   NEXT_PUBLIC_FEATURE_STUDIO  Section Studio page, its API, and its nav/home links
//   NEXT_PUBLIC_FEATURE_TOKENS  Token wallet, pricing page and charging. When off,
//                               everything is free (rate limits still apply) and the
//                               Studio's paid "Pro" tier is hidden.
const on = (v: string | undefined) => !/^(off|false|0|no)$/i.test((v ?? "").trim());

export const FEATURES = {
  studio: on(process.env.NEXT_PUBLIC_FEATURE_STUDIO),
  tokens: on(process.env.NEXT_PUBLIC_FEATURE_TOKENS),
} as const;
