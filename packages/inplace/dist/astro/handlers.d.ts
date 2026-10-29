import { type InplaceHandlerDeps } from "../http/handler.js";
export declare const prerender = false;
export type AstroEndpointContext = {
    request: Request;
};
export type AstroEndpoint = (context: AstroEndpointContext) => Promise<Response>;
export declare function createAstroHandlers(deps: InplaceHandlerDeps): {
    ALL: AstroEndpoint;
    GET: AstroEndpoint;
    POST: AstroEndpoint;
    PUT: AstroEndpoint;
    DELETE: AstroEndpoint;
    prerender: false;
};
export declare function ALL(context: AstroEndpointContext): Promise<Response>;
export declare function GET(context: AstroEndpointContext): Promise<Response>;
export declare function POST(context: AstroEndpointContext): Promise<Response>;
export declare function PUT(context: AstroEndpointContext): Promise<Response>;
export declare function DELETE(context: AstroEndpointContext): Promise<Response>;
