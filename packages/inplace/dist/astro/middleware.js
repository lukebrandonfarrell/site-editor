import { applyEditableCacheHeaders } from "./cache.js";
/**
 * Optional Astro middleware. If any `<Editable>` rendered, tag the response
 * for the short CDN cache. Use this when you would rather not call
 * `applyEditableCacheHeaders` on each page.
 *
 * ```ts
 * // src/middleware.ts
 * export { onRequest } from "@thereactnativerewind/inplace/astro/middleware";
 * ```
 */
export async function onRequest(context, next) {
    const response = await next();
    if (context.locals.siteEditor)
        applyEditableCacheHeaders(response);
    return response;
}
