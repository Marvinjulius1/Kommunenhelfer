/**
 * Rate Limiting (Sliding Window, im Arbeitsspeicher).
 *
 * Für eine einzelne Instanz ausreichend. Bei mehreren Instanzen durch
 * einen gemeinsamen Speicher (z. B. Redis/Valkey in der EU) ersetzen.
 */
import "server-only";

const buckets = new Map<string, number[]>();

export interface RateLimitResult {
  ok: boolean;
  retryAfter: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { ok: false, retryAfter: Math.ceil((windowMs - (now - hits[0])) / 1000) };
  }
  hits.push(now);
  buckets.set(key, hits);
  // Gelegentlich aufräumen, damit der Speicher nicht wächst.
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  }
  return { ok: true, retryAfter: 0 };
}

/**
 * Client-IP für das Rate Limiting. Die IP wird nicht gespeichert oder geloggt,
 * sondern nur gehasht als Schlüssel im Arbeitsspeicher verwendet.
 */
/**
 * Client-Kennung für das Rate-Limit. Der erste Eintrag in X-Forwarded-For stammt vom
 * Client selbst und ist fälschbar – maßgeblich ist, was der eigene Proxy setzt:
 * X-Real-IP (Vercel, übliche nginx-Konfiguration) oder der zuletzt angehängte Eintrag.
 */
export function clientKey(req: Request): string {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const fwd = req.headers.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean);
  return fwd?.at(-1) || "unknown";
}

export function tooMany(retryAfter: number) {
  return Response.json(
    { fehler: "zu_viele_anfragen" },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}
