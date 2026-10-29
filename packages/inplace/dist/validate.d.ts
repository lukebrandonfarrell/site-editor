import type { ContentMap, TextContent } from "./types.js";
export declare function assertSpotId(id: string): void;
export declare function assertSiteId(id: string): void;
export declare function parseTextContent(input: unknown, maxLength: number): TextContent;
export declare function textContent(value: string, maxLength: number): TextContent;
export declare function isTextContent(input: unknown): input is TextContent;
export declare function publishedMap(spots: Array<{
    spotId: string;
    published: TextContent | null;
}>): ContentMap;
export declare function draftMap(spots: Array<{
    spotId: string;
    draft: TextContent;
}>): ContentMap;
export declare function sanitizeContentMap(input: unknown): ContentMap;
