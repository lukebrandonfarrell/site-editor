import type { ContentMap, SpotRecord } from "../types.js";
/** Promote every draft to published. The version stores the draft map. */
export declare function promoteDrafts(spots: SpotRecord[]): {
    spots: SpotRecord[];
    content: ContentMap;
};
/**
 * Make the live site match a historical version.
 * Spots that did not exist in that version stay in the table so the code seed
 * cannot recreate them, but their published value is cleared.
 */
export declare function applyVersionContent(spots: SpotRecord[], content: ContentMap): SpotRecord[];
