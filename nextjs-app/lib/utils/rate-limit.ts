// Minimal in-memory rate limiter (per-process; resets on restart, which is
// fine for its purpose of curbing feedback spam).
const lastHit: Map<string, number> = new Map();

const MAX_TRACKED_KEYS = 10_000;

export function isRateLimited(key: string, windowMs: number): boolean {
  const now = Date.now();
  const previous = lastHit.get(key);

  if (previous !== undefined && now - previous < windowMs) {
    return true;
  }

  // Opportunistic prune so the map cannot grow unbounded
  if (lastHit.size >= MAX_TRACKED_KEYS) {
    for (const [k, t] of lastHit) {
      if (now - t >= windowMs) {
        lastHit.delete(k);
      }
    }
  }

  lastHit.set(key, now);
  return false;
}

// Counting limiter: true once `max` hits land on the key within the window
// (per-process, like the one above). Used for guessable codes.
const hits: Map<string, number[]> = new Map();

export function isOverAttemptLimit(key: string, windowMs: number, max: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter(t => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size >= MAX_TRACKED_KEYS) {
    for (const [k, ts] of hits) {
      if (ts.every(t => now - t >= windowMs)) {
        hits.delete(k);
      }
    }
  }
  return false;
}
