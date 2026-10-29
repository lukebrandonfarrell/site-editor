import assert from "node:assert/strict";
import { test } from "node:test";
import { displayedText } from "../src/content/display.js";
import { publishSite, readPublishedOrSnapshot, restoreSite, saveDraft, seedSpot, undoSite } from "../src/content/service.js";
import { DatabaseUnavailableError } from "../src/errors.js";
import { MemorySnapshotStore } from "../src/snapshot.js";
import { MemoryContentStore } from "../src/store/memory.js";
import { parseTextContent } from "../src/validate.js";

const limits = { maxTextLength: 100, maxSpots: 5 };

test("seed writes the code string once and ignores later code changes", async () => {
  const store = new MemoryContentStore();
  const first = await seedSpot(store, "demo", "hero.title", "Initial text", limits);
  const second = await seedSpot(store, "demo", "hero.title", "Rewritten in code", limits);
  assert.equal(first.created, true);
  assert.equal(first.value, "Initial text");
  assert.equal(second.created, false);
  assert.equal(second.value, "Initial text");
});

test("drafts do not change the published text until publish", async () => {
  const store = new MemoryContentStore();
  const snapshots = new MemorySnapshotStore();
  await seedSpot(store, "demo", "hero.title", "Initial text", limits);
  await saveDraft(store, "demo", "hero.title", { type: "text", value: "Edited draft" }, "preview");
  assert.equal((await store.getSpot("demo", "hero.title"))?.updatedBy, "preview");

  const before = await readPublishedOrSnapshot(store, snapshots, "demo");
  assert.equal(before.source, "database");
  assert.equal(before.content["hero.title"]?.value, "Initial text");

  const published = await publishSite(store, snapshots, "demo", "preview");
  assert.equal(published.version, 1);
  assert.equal((await store.listVersions("demo", 1))[0]?.actor, "preview");
  assert.equal(published.content["hero.title"]?.value, "Edited draft");
  assert.equal(snapshots.value?.version, 1);
  assert.equal(snapshots.value?.content["hero.title"]?.value, "Edited draft");

  const after = await readPublishedOrSnapshot(store, snapshots, "demo");
  assert.equal(after.content["hero.title"]?.value, "Edited draft");
});

test("restore and undo replay published versions without deleting the spot", async () => {
  const store = new MemoryContentStore();
  const snapshots = new MemorySnapshotStore();
  await seedSpot(store, "demo", "hero.title", "One", limits);
  await seedSpot(store, "demo", "hero.lede", "Lede", limits);
  await publishSite(store, snapshots, "demo", "editor");

  await saveDraft(store, "demo", "hero.title", { type: "text", value: "Two" }, "editor@example.com");
  await publishSite(store, snapshots, "demo", "editor");
  await seedSpot(store, "demo", "footer.line", "Later", limits);

  const restored = await restoreSite(store, snapshots, "demo", 1, "editor");
  assert.equal(restored.version, 3);
  const afterRestore = await readPublishedOrSnapshot(store, snapshots, "demo");
  assert.equal(afterRestore.content["hero.title"]?.value, "One");
  assert.equal(afterRestore.content["hero.lede"]?.value, "Lede");
  assert.equal(afterRestore.content["footer.line"], undefined);

  const reseed = await seedSpot(store, "demo", "footer.line", "Code tries to come back", limits);
  assert.equal(reseed.created, false);
  assert.equal(reseed.value, "");

  const undone = await undoSite(store, snapshots, "demo", "editor");
  assert.equal(undone.version, 4);
  const afterUndo = await readPublishedOrSnapshot(store, snapshots, "demo");
  assert.equal(afterUndo.content["hero.title"]?.value, "Two");
  assert.equal(snapshots.value?.content["hero.title"]?.value, "Two");
});

test("a database outage serves the last published snapshot and not the code seed", async () => {
  const snapshots = new MemorySnapshotStore();
  await snapshots.write({
    format: 1,
    siteId: "demo",
    version: 4,
    publishedAt: "2026-10-29T12:00:00.000Z",
    content: { "hero.title": { type: "text", value: "From snapshot" } },
  });
  const dead = {
    async listSpots(): Promise<never> {
      throw new DatabaseUnavailableError("connection refused");
    },
  };
  const result = await readPublishedOrSnapshot(dead, snapshots, "demo");
  assert.equal(result.source, "snapshot");
  assert.equal(result.content["hero.title"]?.value, "From snapshot");
  assert.equal(result.content["missing"], undefined);
});

test("only text content is accepted", () => {
  assert.throws(() => parseTextContent({ type: "image", src: "/a.png", alt: "A" }, 100), /text/i);
  assert.throws(() => parseTextContent({ type: "text", value: "x".repeat(10) }, 4), /longer/i);
  assert.deepEqual(parseTextContent({ type: "text", value: "Hello" }, 10), {
    type: "text",
    value: "Hello",
  });
});

test("the code seed shows only when nothing has been stored", () => {
  assert.equal(displayedText({ seed: "  Rooms  ", source: "seed", published: undefined }), "Rooms");
  assert.equal(
    displayedText({ seed: "Rooms", source: "snapshot", published: "From snapshot" }),
    "From snapshot",
  );
  assert.equal(displayedText({ seed: "Rooms", source: "snapshot", published: undefined }), "");
  assert.equal(
    displayedText({ seed: "Rooms", source: "database", published: "From the database" }),
    "From the database",
  );
  assert.equal(displayedText({ seed: "Rooms", source: "database", published: "" }), "");
});

test("unknown spots cannot be saved", async () => {
  const store = new MemoryContentStore();
  await assert.rejects(
    () => saveDraft(store, "demo", "hero.title", { type: "text", value: "Nope" }, "preview"),
    /No editable spot/,
  );
});
