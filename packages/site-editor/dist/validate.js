import { ContentError } from "./errors.js";
const SPOT_ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;
const SITE_ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,63}$/;
export function assertSpotId(id) {
    if (!SPOT_ID.test(id)) {
        throw new ContentError("invalid_spot_id", "Spot ids must be 1–128 characters and use letters, numbers, dots, underscores, colons, or hyphens.");
    }
}
export function assertSiteId(id) {
    if (!SITE_ID.test(id)) {
        throw new ContentError("invalid_site_id", "SITE_EDITOR_SITE_ID must be 1–64 characters and use letters, numbers, dots, underscores, colons, or hyphens.");
    }
}
export function parseTextContent(input, maxLength) {
    if (!input || typeof input !== "object") {
        throw new ContentError("invalid_content", "Content must be an object with a type.");
    }
    const record = input;
    if (record.type !== "text") {
        throw new ContentError("unsupported_type", "Only text content can be saved in this version of Site Editor.");
    }
    if (typeof record.value !== "string") {
        throw new ContentError("invalid_content", "Text content needs a string value.");
    }
    if (record.value.includes("\u0000")) {
        throw new ContentError("invalid_content", "Text content cannot include null characters.");
    }
    if (record.value.length > maxLength) {
        throw new ContentError("text_too_long", `Text is longer than ${maxLength} characters.`);
    }
    return { type: "text", value: record.value };
}
export function textContent(value, maxLength) {
    return parseTextContent({ type: "text", value }, maxLength);
}
export function isTextContent(input) {
    if (!input || typeof input !== "object")
        return false;
    const record = input;
    return record.type === "text" && typeof record.value === "string";
}
export function publishedMap(spots) {
    const content = {};
    for (const spot of spots) {
        if (spot.published && isTextContent(spot.published)) {
            content[spot.spotId] = { type: "text", value: spot.published.value };
        }
    }
    return content;
}
export function draftMap(spots) {
    const content = {};
    for (const spot of spots) {
        if (isTextContent(spot.draft)) {
            content[spot.spotId] = { type: "text", value: spot.draft.value };
        }
    }
    return content;
}
export function sanitizeContentMap(input) {
    if (!input || typeof input !== "object" || Array.isArray(input))
        return {};
    const content = {};
    for (const [spotId, value] of Object.entries(input)) {
        if (!SPOT_ID.test(spotId) || !isTextContent(value))
            continue;
        content[spotId] = { type: "text", value: value.value };
    }
    return content;
}
