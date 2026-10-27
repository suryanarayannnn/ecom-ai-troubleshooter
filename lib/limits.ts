// Shared by the browser and the server.
// 500,000 characters ≈ 1–2 months of daily exports across PnL, campaign,
// product, state and fulfilment files. Vercel's request limit (4.5 MB) is far above this.
export const MAX_INPUT_CHARS = 500_000;
