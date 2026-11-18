import "server-only";

/**
 * Best-effort sliding-window limiter for the shared AI key.
 *
 * It lives in memory, so each serverless instance keeps its own window. That's
 * enough to stop casual abuse of a free-tier key on a side project without
 * adding a database. Swap in Upstash/Redis if traffic ever needs a hard global cap.
 */

const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = Number(process.env.FINROBO_RATE_LIMIT ?? 20);
const hits = new Map<string, number[]>();

export function checkRateLimit(id: string): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const now = Date.now();
  const recent = (hits.get(id) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) {
    return { ok: false, retryAfterSeconds: Math.ceil((recent[0] + WINDOW_MS - now) / 1000) };
  }
  recent.push(now);
  hits.set(id, recent);

  // Keep the map from growing without bound on long-lived instances.
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    }
  }
  return { ok: true };
}
