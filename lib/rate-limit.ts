type Entry = { count: number; resetAt: number };

// In-memory store. Works for single-instance deployments (dev + small prod).
// For multi-instance, replace with a Redis-backed store.
const store = new Map<string, Entry>();

// Keys that are never hit again would otherwise linger forever, so sweep out
// expired entries periodically (every N calls) to keep the map bounded.
let callsSinceSweep = 0;
const SWEEP_EVERY = 1000;

function sweepExpired(now: number) {
  for (const [k, e] of store) {
    if (now > e.resetAt) store.delete(k);
  }
}

/**
 * Returns true if the request is allowed, false if it should be rate-limited.
 * @param key       Unique key (e.g. "otp:user@example.com")
 * @param max       Max requests allowed in the window
 * @param windowMs  Window duration in milliseconds
 */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();

  if (++callsSinceSweep >= SWEEP_EVERY) {
    callsSinceSweep = 0;
    sweepExpired(now);
  }

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= max) return false;

  entry.count += 1;
  return true;
}
