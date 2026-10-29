import "server-only";
import type { ContentSource } from "../content/display.js";
import type { ContentMap } from "../types.js";
export declare const getPublishedContent: () => Promise<{
    content: ContentMap;
    source: ContentSource;
}>;
export declare function resolveSpot(id: string, seed: string): Promise<string>;
