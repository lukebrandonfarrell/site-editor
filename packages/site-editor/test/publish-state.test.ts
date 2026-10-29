import assert from "node:assert/strict";
import { test } from "node:test";
import { pendingChangeCount, publishIsQuiet, publishLabel } from "../src/client/publish-state.ts";

test("publish stays quiet until drafts differ from the published text", () => {
  const published = { "hero.title": "Rooms", "hero.lede": "Quiet" };
  assert.equal(pendingChangeCount(published, published), 0);
  assert.equal(publishLabel(0, "idle"), "Publish");
  assert.equal(publishIsQuiet(0, "idle"), true);

  const one = pendingChangeCount(published, { ...published, "hero.title": "Rooms that hold the light." });
  assert.equal(one, 1);
  assert.equal(publishLabel(one, "idle"), "Publish 1 change");
  assert.equal(publishIsQuiet(one, "idle"), false);

  const two = pendingChangeCount(published, {
    "hero.title": "Light",
    "hero.lede": "Weather",
  });
  assert.equal(two, 2);
  assert.equal(publishLabel(two, "idle"), "Publish 2 changes");
  assert.equal(publishLabel(two, "publishing"), "Publishing…");
  assert.equal(publishLabel(0, "published"), "Published");
});
