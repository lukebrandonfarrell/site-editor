type MiddlewareContext = {
    locals: {
        siteEditor?: boolean;
    };
};
/**
 * Optional Astro middleware. If any `<Editable>` rendered, tag the response
 * for the short CDN cache. Use this when you would rather not call
 * `applyEditableCacheHeaders` on each page.
 *
 * ```ts
 * // src/middleware.ts
 * export { onRequest } from "@thereactnativerewind/site-editor/astro/middleware";
 * ```
 */
export declare function onRequest(context: MiddlewareContext, next: () => Promise<Response>): Promise<Response>;
export {};
