import { type ContentSource } from "./display.js";
import type { ContentMap } from "../types.js";
export type PublishedState = {
    content: ContentMap;
    source: ContentSource;
};
export declare function loadPublishedState(): Promise<PublishedState>;
export declare function resolveFromState(state: PublishedState, id: string, seed: string, seedMissing: () => Promise<string>): Promise<string>;
/** Resolve one spot, seeding it in Postgres the first time the database is up. */
export declare function resolveEditableText(id: string, seed: string, state?: PublishedState): Promise<string>;
