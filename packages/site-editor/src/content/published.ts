import { readConfig } from "../config.js";
import { displayedText, type ContentSource } from "./display.js";
import { seedSpot } from "./service.js";
import { isDbUnavailable } from "../errors.js";
import { createSnapshotStore } from "../snapshot.js";
import { createPostgresStores } from "../store/postgres.js";
import type { ContentMap } from "../types.js";
import { publishedMap } from "../validate.js";

export type PublishedState = {
  content: ContentMap;
  source: ContentSource;
};

/**
 * Read published copy without any framework cache.
 * Next.js wraps this in `unstable_cache`. Astro calls it on each origin render
 * and lets the CDN hold the HTML for a few seconds.
 */
export async function loadPublishedState(): Promise<PublishedState> {
  const config = readConfig();
  if (!config.databaseUrl) return { content: {}, source: "seed" };
  try {
    const spots = await createPostgresStores(config.databaseUrl).content.listSpots(config.siteId);
    return { content: publishedMap(spots), source: "database" };
  } catch (error) {
    if (!isDbUnavailable(error)) throw error;
    const snapshot = await createSnapshotStore().read(config.siteId);
    if (!snapshot) return { content: {}, source: "seed" };
    return { content: snapshot.content, source: "snapshot" };
  }
}

export async function resolveFromState(
  state: PublishedState,
  id: string,
  seed: string,
  seedMissing: () => Promise<string>,
): Promise<string> {
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
  } catch (error) {
    if (isDbUnavailable(error)) {
      return displayedText({ seed, source: "seed", published: undefined });
    }
    throw error;
  }
}

/** Resolve one spot, seeding it in Postgres the first time the database is up. */
export async function resolveEditableText(id: string, seed: string, state?: PublishedState): Promise<string> {
  const config = readConfig();
  const loaded = state ?? (await loadPublishedState());
  return resolveFromState(loaded, id, seed, async () => {
    if (!config.databaseUrl) {
      return displayedText({ seed, source: "seed", published: undefined });
    }
    const seeded = await seedSpot(
      createPostgresStores(config.databaseUrl).content,
      config.siteId,
      id,
      seed.trim(),
      { maxTextLength: config.maxTextLength, maxSpots: config.maxSpots },
    );
    loaded.content[id] = { type: "text", value: seeded.value };
    return seeded.value;
  });
}
