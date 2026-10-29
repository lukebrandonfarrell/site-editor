import { readConfig } from "../config.js";
import { displayedText } from "./display.js";
import { seedSpot } from "./service.js";
import { createSnapshotStore } from "../snapshot.js";
import { createPostgresStores } from "../store/postgres.js";
import { publishedMap } from "../validate.js";
/**
 * Read published copy without any framework cache.
 * Next.js wraps this in `unstable_cache`. Astro calls it on each origin render
 * and lets the CDN hold the HTML for a few seconds.
 */
function warn(message, error) {
    console.warn(`[site-editor] ${message}`, error instanceof Error ? error.message : error);
}
export async function loadPublishedState() {
    try {
        const config = readConfig();
        if (!config.databaseUrl)
            return { content: {}, source: "seed" };
        try {
            const spots = await createPostgresStores(config.databaseUrl).content.listSpots(config.siteId);
            return { content: publishedMap(spots), source: "database" };
        }
        catch (error) {
            warn("Database read failed. Trying the published snapshot.", error);
            try {
                const snapshot = await createSnapshotStore().read(config.siteId);
                if (snapshot)
                    return { content: snapshot.content, source: "snapshot" };
            }
            catch (snapshotError) {
                warn("Snapshot read failed. Serving seed text.", snapshotError);
            }
            return { content: {}, source: "seed" };
        }
    }
    catch (error) {
        warn("Published content is unavailable. Serving seed text.", error);
        return { content: {}, source: "seed" };
    }
}
export async function resolveFromState(state, id, seed, seedMissing) {
    if (state.source !== "database") {
        return displayedText({
            seed,
            source: state.source,
            published: state.content[id]?.value,
        });
    }
    if (Object.prototype.hasOwnProperty.call(state.content, id)) {
        return displayedText({
            seed,
            source: "database",
            published: state.content[id]?.value,
        });
    }
    try {
        return await seedMissing();
    }
    catch (error) {
        warn(`Spot "${id}" could not be stored. Serving its seed.`, error);
        return displayedText({ seed, source: "seed", published: undefined });
    }
}
/** Resolve one spot, seeding it in Postgres the first time the database is up. */
export async function resolveEditableText(id, seed, state) {
    const config = readConfig();
    const loaded = state ?? (await loadPublishedState());
    return resolveFromState(loaded, id, seed, async () => {
        if (!config.databaseUrl) {
            return displayedText({ seed, source: "seed", published: undefined });
        }
        const seeded = await seedSpot(createPostgresStores(config.databaseUrl).content, config.siteId, id, seed.trim(), { maxTextLength: config.maxTextLength, maxSpots: config.maxSpots });
        loaded.content[id] = { type: "text", value: seeded.value };
        return seeded.value;
    });
}
