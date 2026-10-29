/**
 * Fixed-window counter. Rejected calls do not extend the window or add hits,
 * so a burst cannot slide the window forward.
 */
export function consumeFixedWindow(entry, nowMs, limit, windowMs) {
    if (!entry || nowMs - entry.windowStartMs >= windowMs) {
        return {
            decision: { allowed: true, retryAfterMs: 0 },
            entry: { hits: 1, windowStartMs: nowMs },
        };
    }
    if (entry.hits >= limit) {
        return {
            decision: {
                allowed: false,
                retryAfterMs: Math.max(0, windowMs - (nowMs - entry.windowStartMs)),
            },
            entry,
        };
    }
    return {
        decision: { allowed: true, retryAfterMs: 0 },
        entry: { hits: entry.hits + 1, windowStartMs: entry.windowStartMs },
    };
}
