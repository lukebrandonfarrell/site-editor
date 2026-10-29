import { createSiteEditorHandler } from "../http/handler.js";
import { createDefaultServices } from "../runtime/services.js";
import { revalidateAstroCache } from "./cache.js";
export const prerender = false;
export function createAstroHandlers(deps) {
    const handler = createSiteEditorHandler({
        ...deps,
        revalidate: async () => {
            await deps.revalidate?.();
            await revalidateAstroCache();
        },
    });
    const ALL = (context) => handler(context.request);
    return { ALL, GET: ALL, POST: ALL, PUT: ALL, DELETE: ALL, prerender: false };
}
let endpoints;
function liveEndpoints() {
    if (!endpoints) {
        endpoints = createAstroHandlers(createDefaultServices());
    }
    return endpoints;
}
export function ALL(context) {
    return liveEndpoints().ALL(context);
}
export function GET(context) {
    return liveEndpoints().GET(context);
}
export function POST(context) {
    return liveEndpoints().POST(context);
}
export function PUT(context) {
    return liveEndpoints().PUT(context);
}
export function DELETE(context) {
    return liveEndpoints().DELETE(context);
}
