/** Promote every draft to published. The version stores the draft map. */
export function promoteDrafts(spots) {
    const content = {};
    const next = spots.map((spot) => {
        const draft = { type: "text", value: spot.draft.value };
        content[spot.spotId] = draft;
        return { spotId: spot.spotId, draft, published: draft, updatedBy: spot.updatedBy };
    });
    return { spots: next, content };
}
/**
 * Make the live site match a historical version.
 * Spots that did not exist in that version stay in the table so the code seed
 * cannot recreate them, but their published value is cleared.
 */
export function applyVersionContent(spots, content) {
    const remaining = new Map(Object.entries(content));
    const next = [];
    for (const spot of spots) {
        const value = remaining.get(spot.spotId);
        if (value) {
            remaining.delete(spot.spotId);
            const copy = { type: "text", value: value.value };
            next.push({ spotId: spot.spotId, draft: copy, published: copy, updatedBy: spot.updatedBy });
        }
        else {
            next.push({
                spotId: spot.spotId,
                draft: { type: "text", value: "" },
                published: null,
                updatedBy: spot.updatedBy,
            });
        }
    }
    for (const [spotId, value] of remaining) {
        const copy = { type: "text", value: value.value };
        next.push({ spotId, draft: copy, published: copy, updatedBy: null });
    }
    return next;
}
