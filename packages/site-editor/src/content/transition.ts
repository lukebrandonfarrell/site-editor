import type { ContentMap, SpotRecord } from "../types.js";

/** Promote every draft to published. The version stores the draft map. */
export function promoteDrafts(spots: SpotRecord[]): { spots: SpotRecord[]; content: ContentMap } {
  const content: ContentMap = {};
  const next = spots.map((spot) => {
    const draft = { type: "text" as const, value: spot.draft.value };
    content[spot.spotId] = draft;
    return { spotId: spot.spotId, draft, published: draft };
  });
  return { spots: next, content };
}

/**
 * Make the live site match a historical version.
 * Spots that did not exist in that version stay in the table so the code seed
 * cannot recreate them, but their published value is cleared.
 */
export function applyVersionContent(spots: SpotRecord[], content: ContentMap): SpotRecord[] {
  const remaining = new Map(Object.entries(content));
  const next: SpotRecord[] = [];
  for (const spot of spots) {
    const value = remaining.get(spot.spotId);
    if (value) {
      remaining.delete(spot.spotId);
      const copy = { type: "text" as const, value: value.value };
      next.push({ spotId: spot.spotId, draft: copy, published: copy });
    } else {
      next.push({
        spotId: spot.spotId,
        draft: { type: "text", value: "" },
        published: null,
      });
    }
  }
  for (const [spotId, value] of remaining) {
    const copy = { type: "text" as const, value: value.value };
    next.push({ spotId, draft: copy, published: copy });
  }
  return next;
}
