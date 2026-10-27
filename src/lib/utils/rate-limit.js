const buckets = new Map();
export function rateLimit(key, limit, windowMs, now = Date.now()) {
    if (buckets.size > 10_000)
        for (const [k, b] of buckets)
            if (b.resetAt <= now)
                buckets.delete(k);
    let b = buckets.get(key);
    if (!b || b.resetAt <= now) {
        b = { count: 0, resetAt: now + windowMs };
        buckets.set(key, b);
    }
    b.count++;
    return { ok: b.count <= limit, remaining: Math.max(0, limit - b.count), retryAfterMs: Math.max(0, b.resetAt - now) };
}
export const _resetRateLimits = () => buckets.clear();
