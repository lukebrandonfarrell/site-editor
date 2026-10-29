import { createSiteEditorHandler, editorUnavailableResponse, type SiteEditorHandlerDeps } from "../http/handler.js";
import { createDefaultServices } from "../runtime/services.js";
import { revalidateAstroCache } from "./cache.js";

export const prerender = false;

export type AstroEndpointContext = {
  request: Request;
};

export type AstroEndpoint = (context: AstroEndpointContext) => Promise<Response>;

export function createAstroHandlers(deps: SiteEditorHandlerDeps): {
  ALL: AstroEndpoint;
  GET: AstroEndpoint;
  POST: AstroEndpoint;
  PUT: AstroEndpoint;
  DELETE: AstroEndpoint;
  prerender: false;
} {
  const handler = createSiteEditorHandler({
    ...deps,
    revalidate: async () => {
      await deps.revalidate?.();
      await revalidateAstroCache();
    },
  });
  const ALL: AstroEndpoint = (context) => handler(context.request);
  return { ALL, GET: ALL, POST: ALL, PUT: ALL, DELETE: ALL, prerender: false };
}

let endpoints: ReturnType<typeof createAstroHandlers> | undefined;

function liveEndpoints() {
  if (!endpoints) {
    endpoints = createAstroHandlers(createDefaultServices());
  }
  return endpoints;
}

async function call(invoke: (endpoints: ReturnType<typeof createAstroHandlers>) => Promise<Response>): Promise<Response> {
  try {
    return await invoke(liveEndpoints());
  } catch (error) {
    return editorUnavailableResponse(error);
  }
}

export function ALL(context: AstroEndpointContext): Promise<Response> {
  return call((endpoints) => endpoints.ALL(context));
}

export function GET(context: AstroEndpointContext): Promise<Response> {
  return call((endpoints) => endpoints.GET(context));
}

export function POST(context: AstroEndpointContext): Promise<Response> {
  return call((endpoints) => endpoints.POST(context));
}

export function PUT(context: AstroEndpointContext): Promise<Response> {
  return call((endpoints) => endpoints.PUT(context));
}

export function DELETE(context: AstroEndpointContext): Promise<Response> {
  return call((endpoints) => endpoints.DELETE(context));
}
