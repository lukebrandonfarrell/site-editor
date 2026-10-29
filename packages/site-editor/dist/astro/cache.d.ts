/** CDN lifetime for pages that render `<Editable>`. Short on purpose. */
export declare const EDITABLE_CACHE_CONTROL = "public, max-age=0, s-maxage=5, stale-while-revalidate=30";
export declare const EDITABLE_CACHE_TAG = "site-editor";
/**
 * Ask Vercel's CDN to cache the HTML for a few seconds and tag it so publish
 * can drop the entry. Browsers are told not to cache (`max-age=0`) so a reload
 * after the CDN entry is gone shows the new copy.
 */
export declare function applyEditableCacheHeaders(response: {
    headers: Headers;
}): void;
/**
 * Drop the tagged CDN entry after publish. Outside Vercel, or if the runtime
 * cannot purge, the short `s-maxage` still bounds how long the old HTML lives.
 */
export declare function revalidateAstroCache(): Promise<void>;
