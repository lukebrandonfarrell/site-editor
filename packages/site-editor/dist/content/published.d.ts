import { type ContentSource } from "./display.js";
import type { ContentMap } from "../types.js";
export type PublishedState = {
    content: ContentMap;
    source: ContentSource;
};
/**
 * Read published copy without any framework cache.
 * Next.js wraps this in `unstable_cache`. Astro calls it on each origin render
 * and lets the CDN hold the HTML for a few seconds.
 */
export declare function loadPublishedState(): Promise<PublishedState>;
export declare function resolveFromState(state: PublishedState, id: string, seed: string, seedMissing: () => Promise<string>): Promise<string>;
/** Resolve one spot, seeding it in Postgres the first time the database is up. */
export declare function resolveEditableText(id: string, seed: string, state?: PublishedState): Promise<string>;
