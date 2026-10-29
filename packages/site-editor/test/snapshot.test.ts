import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { FileSnapshotStore, parseSnapshot } from "../src/snapshot.js";

test("snapshot files round-trip and ignore corrupt JSON", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "site-editor-snap-"));
  const file = path.join(directory, "demo.json");
  const store = new FileSnapshotStore({ SITE_EDITOR_SNAPSHOT_PATH: file });
  try {
    await store.write({
      format: 1,
      siteId: "demo",
      version: 2,
      publishedAt: "2026-10-29T12:00:00.000Z",
      content: {
        "hero.title": { type: "text", value: "Saved" },
        "hero.image": { type: "image", src: "/x" } as never,
      },
    });
    const read = await store.read("demo");
    assert.equal(read?.content["hero.title"]?.value, "Saved");
    assert.equal(read?.content["hero.image"], undefined);
    assert.equal(parseSnapshot("{", "demo"), null);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
