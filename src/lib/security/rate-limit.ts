type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;
let lastCleanupAt = 0;

function cleanupExpiredBuckets(now: number) {
  if (now - lastCleanupAt < 60_000 && buckets.size < MAX_BUCKETS) return;

  lastCleanupAt = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }

  if (buckets.size > MAX_BUCKETS) {
    const oldest = [...buckets.entries()]
      .sort((left, right) => left[1].resetAt - right[1].resetAt)
      .slice(0, buckets.size - MAX_BUCKETS);
    for (const [key] of oldest) buckets.delete(key);
  }
}

export function rateLimit(key: string, limit = 20, windowMs = 60_000) {
  if (process.env.NODE_ENV !== "production" && process.env.RATE_LIMIT_DISABLED === "true") {
    return { ok: true, remaining: limit, resetAt: Date.now() + windowMs };
  }

  const now = Date.now();
  cleanupExpiredBuckets(now);
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (bucket.count >= limit) {
    return { ok: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return { ok: true, remaining: limit - bucket.count, resetAt: bucket.resetAt };
}
