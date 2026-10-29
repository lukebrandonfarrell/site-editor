import { ContentError, isDbUnavailable } from "../errors.js";
import type { ContentStore } from "../store/types.js";
import type { SnapshotStore } from "../snapshot.js";
import type { ContentMap, PublishResult, TextContent } from "../types.js";
import { assertSpotId, publishedMap, textContent } from "../validate.js";

export type SeedLimits = {
  maxTextLength: number;
  maxSpots: number;
};

export async function seedSpot(
  store: ContentStore,
  siteId: string,
  spotId: string,
  seed: string,
  limits: SeedLimits,
): Promise<{ value: string; created: boolean }> {
  assertSpotId(spotId);
  const existing = await store.getSpot(siteId, spotId);
  if (existing) {
    // The row is the source of truth, including an explicit empty publish
    // left behind by a restore. Never fall back to the string in code.
    return { value: existing.published?.value ?? "", created: false };
  }
  const count = await store.countSpots(siteId);
  if (count >= limits.maxSpots) {
    throw new ContentError("too_many_spots", `This site already has ${limits.maxSpots} editable spots.`);
  }
  const content = textContent(seed, limits.maxTextLength);
  const inserted = await store.insertSpot(siteId, {
    spotId,
    draft: content,
    published: content,
  });
  if (!inserted) {
    const again = await store.getSpot(siteId, spotId);
    return { value: again?.published?.value ?? "", created: false };
  }
  return { value: content.value, created: true };
}

export async function saveDraft(
  store: ContentStore,
  siteId: string,
  spotId: string,
  content: TextContent,
): Promise<void> {
  assertSpotId(spotId);
  const updated = await store.updateDraft(siteId, spotId, content);
  if (!updated) {
    throw new ContentError(
      "spot_not_found",
      `No editable spot "${spotId}" exists yet. Render it on the page before saving.`,
    );
  }
}

export async function publishSite(
  store: ContentStore,
  snapshots: SnapshotStore,
  siteId: string,
  actor: string | null,
): Promise<PublishResult> {
  const result = await store.publish(siteId, actor);
  await snapshots.write({
    format: 1,
    siteId,
    version: result.version,
    publishedAt: result.createdAt,
    content: result.content,
  });
  return result;
}

export async function restoreSite(
  store: ContentStore,
  snapshots: SnapshotStore,
  siteId: string,
  version: number,
  actor: string | null,
): Promise<PublishResult> {
  if (!Number.isInteger(version) || version < 1) {
    throw new ContentError("version_not_found", "Choose a published version to restore.");
  }
  const result = await store.restore(siteId, version, actor);
  await snapshots.write({
    format: 1,
    siteId,
    version: result.version,
    publishedAt: result.createdAt,
    content: result.content,
  });
  return result;
}

export async function undoSite(
  store: ContentStore,
  snapshots: SnapshotStore,
  siteId: string,
  actor: string | null,
): Promise<PublishResult> {
  const versions = await store.listVersions(siteId, 2);
  const previous = versions[1];
  if (!previous) {
    throw new ContentError("no_version_to_undo", "There is no earlier published version to undo.");
  }
  return restoreSite(store, snapshots, siteId, previous.version, actor);
}

export async function readPublishedOrSnapshot(
  store: Pick<ContentStore, "listSpots">,
  snapshots: SnapshotStore,
  siteId: string,
): Promise<{ content: ContentMap; source: "database" | "snapshot" }> {
  try {
    const spots = await store.listSpots(siteId);
    return { content: publishedMap(spots), source: "database" };
  } catch (error) {
    if (!isDbUnavailable(error)) throw error;
    const snapshot = await snapshots.read(siteId);
    return { content: snapshot?.content ?? {}, source: "snapshot" };
  }
}
