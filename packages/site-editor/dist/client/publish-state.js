export function textValueMap(content) {
    const next = {};
    for (const [id, value] of Object.entries(content ?? {})) {
        if (value?.type === "text" && typeof value.value === "string")
            next[id] = value.value;
    }
    return next;
}
/** Spots whose draft text differs from the published text. */
export function pendingChangeCount(published, drafts) {
    let count = 0;
    for (const [id, draft] of Object.entries(drafts)) {
        if (draft !== (published[id] ?? ""))
            count += 1;
    }
    return count;
}
export function publishLabel(pending, phase) {
    if (phase === "publishing")
        return "Publishing…";
    if (phase === "published")
        return "Published";
    if (pending <= 0)
        return "Publish";
    if (pending === 1)
        return "Publish 1 change";
    return `Publish ${pending} changes`;
}
export function publishIsQuiet(pending, phase) {
    return phase !== "publishing" && pending <= 0;
}
