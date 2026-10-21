// Best-effort, per-instance limiter to stop casual abuse of the public demo.
// Serverless instances don't share memory, so pair this with a spend cap
// at the model provider.
const hits = new Map<string, number[]>();

export function rateLimit(
  key: string,
  max = 5,
  windowMs = 10 * 60 * 1000,
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return { ok: false, retryAfterSec: Math.ceil((windowMs - (now - recent[0])) / 1000) };
  }
  recent.push(now);
  hits.set(key, recent);
  return { ok: true, retryAfterSec: 0 };
}
