import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { readConfig } from "../config.js";
import type { ContentSource } from "../content/display.js";
import { resolveFromState } from "../content/published.js";
import { seedSpot } from "../content/service.js";
import { isDbUnavailable } from "../errors.js";
import { createSnapshotStore } from "../snapshot.js";
import { createPostgresStores } from "../store/postgres.js";
import type { ContentMap } from "../types.js";
import { publishedMap } from "../validate.js";

function requireDatabaseUrl(): string {
  const config = readConfig();
  if (!config.databaseUrl) {
    const error = new Error("DATABASE_URL is not set");
    (error as { code?: string }).code = "ECONNREFUSED";
    throw error;
  }
  return config.databaseUrl;
}

const loadPublishedCached = unstable_cache(
  async (siteId: string) => {
    const stores = createPostgresStores(requireDatabaseUrl());
    const spots = await stores.content.listSpots(siteId);
    return publishedMap(spots);
  },
  ["site-editor-published-v1"],
  { tags: ["site-editor"], revalidate: 60 },
);

export const getPublishedContent = cache(
  async (): Promise<{ content: ContentMap; source: ContentSource }> => {
    const config = readConfig();
    if (!config.databaseUrl) return { content: {}, source: "seed" };
    try {
      const content = await loadPublishedCached(config.siteId);
      return { content, source: "database" };
    } catch (error) {
      if (!isDbUnavailable(error)) throw error;
      const snapshot = await createSnapshotStore().read(config.siteId);
      if (!snapshot) return { content: {}, source: "seed" };
      return { content: snapshot.content, source: "snapshot" };
    }
  },
);

export async function resolveSpot(id: string, seed: string): Promise<string> {
  const config = readConfig();
  const state = await getPublishedContent();
  return resolveFromState(state, id, seed, async () => {
    const seeded = await seedSpot(createPostgresStores(requireDatabaseUrl()).content, config.siteId, id, seed.trim(), {
      maxTextLength: config.maxTextLength,
      maxSpots: config.maxSpots,
    });
    return seeded.value;
  });
}
