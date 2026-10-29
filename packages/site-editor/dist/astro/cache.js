/** CDN lifetime for pages that render `<Editable>`. Short on purpose. */
export const EDITABLE_CACHE_CONTROL = "public, max-age=0, s-maxage=5, stale-while-revalidate=30";
export const EDITABLE_CACHE_TAG = "site-editor";
/**
 * Ask Vercel's CDN to cache the HTML for a few seconds and tag it so publish
 * can drop the entry. Browsers are told not to cache (`max-age=0`) so a reload
 * after the CDN entry is gone shows the new copy.
 */
export function applyEditableCacheHeaders(response) {
    response.headers.set("Cache-Control", EDITABLE_CACHE_CONTROL);
    response.headers.set("CDN-Cache-Control", EDITABLE_CACHE_CONTROL);
    response.headers.set("Vercel-CDN-Cache-Control", EDITABLE_CACHE_CONTROL);
    const current = response.headers.get("Vercel-Cache-Tag");
    const tags = new Set((current ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean));
    tags.add(EDITABLE_CACHE_TAG);
    response.headers.set("Vercel-Cache-Tag", [...tags].join(","));
}
/**
 * Drop the tagged CDN entry after publish. Outside Vercel, or if the runtime
 * cannot purge, the short `s-maxage` still bounds how long the old HTML lives.
 */
export async function revalidateAstroCache() {
    try {
        const mod = (await import("@vercel/functions"));
        if (typeof mod.invalidateByTag !== "function")
            return;
        await mod.invalidateByTag(EDITABLE_CACHE_TAG);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.includes("Cannot find module") || message.includes("ERR_MODULE_NOT_FOUND"))
            return;
        console.error("[site-editor] CDN tag purge was skipped.", error);
    }
}
