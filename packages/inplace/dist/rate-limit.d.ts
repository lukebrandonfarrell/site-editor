export type WindowEntry = {
    hits: number;
    windowStartMs: number;
};
export type RateDecision = {
    allowed: true;
    retryAfterMs: 0;
} | {
    allowed: false;
    retryAfterMs: number;
};
/**
 * Fixed-window counter. Rejected calls do not extend the window or add hits,
 * so a burst cannot slide the window forward.
 */
export declare function consumeFixedWindow(entry: WindowEntry | null, nowMs: number, limit: number, windowMs: number): {
    decision: RateDecision;
    entry: WindowEntry;
};
