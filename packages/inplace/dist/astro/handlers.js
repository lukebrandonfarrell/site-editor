import { createInplaceHandler, editorUnavailableResponse } from "../http/handler.js";
import { createDefaultServices } from "../runtime/services.js";
import { revalidateAstroCache } from "./cache.js";
export const prerender = false;
export function createAstroHandlers(deps) {
    const handler = createInplaceHandler({
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
async function call(invoke) {
    try {
        return await invoke(liveEndpoints());
    }
    catch (error) {
        return editorUnavailableResponse(error);
    }
}
export function ALL(context) {
    return call((endpoints) => endpoints.ALL(context));
}
export function GET(context) {
    return call((endpoints) => endpoints.GET(context));
}
export function POST(context) {
    return call((endpoints) => endpoints.POST(context));
}
export function PUT(context) {
    return call((endpoints) => endpoints.PUT(context));
}
export function DELETE(context) {
    return call((endpoints) => endpoints.DELETE(context));
}
