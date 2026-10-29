import assert from "node:assert/strict";
import { test } from "node:test";
import { MemoryEmailSender } from "../src/auth/email.js";
import { seedSpot } from "../src/content/service.js";
import type { MemoryContentStore } from "../src/store/memory.js";
import { MemorySnapshotStore } from "../src/snapshot.js";
import { editorRequest, handlerFor, testConfig, testDeps } from "./helpers.js";

test("open preview can save a draft, publish, and revalidate without changing published text early", async () => {
  const deps = testDeps();
  const revalidated = { count: 0 };
  deps.revalidate = () => {
    revalidated.count += 1;
  };
  await seedSpot(deps.content, "demo", "hero.title", "Initial text", {
    maxTextLength: 80,
    maxSpots: 20,
  });
  const handle = handlerFor(deps);

  const draft = await handle(
    editorRequest("/api/site-editor/drafts", {
      method: "PUT",
      body: JSON.stringify({ id: "hero.title", content: { type: "text", value: "Live in seconds" } }),
    }),
  );
  assert.equal(draft.status, 200);

  const during = await handle(editorRequest("/api/site-editor/content"));
  const duringBody = (await during.json()) as {
    published: Record<string, { value: string }>;
    drafts: Record<string, { value: string }>;
  };
  assert.equal(duringBody.published["hero.title"]?.value, "Initial text");
  assert.equal(duringBody.drafts["hero.title"]?.value, "Live in seconds");

  const published = await handle(editorRequest("/api/site-editor/publish", { method: "POST", body: "{}" }));
  assert.equal(published.status, 200);
  assert.equal(revalidated.count, 1);
  const snapshot = deps.snapshots as MemorySnapshotStore;
  assert.equal(snapshot.value?.content["hero.title"]?.value, "Live in seconds");

  const after = await handle(editorRequest("/api/site-editor/content"));
  const afterBody = (await after.json()) as { published: Record<string, { value: string }> };
  assert.equal(afterBody.published["hero.title"]?.value, "Live in seconds");
});

test("production rejects anonymous edits until a magic link is consumed", async () => {
  const email = new MemoryEmailSender();
  const deps = testDeps({
    email,
    config: testConfig({ openEditing: false, allowedEmails: "client@example.com" }),
  });
  const handle = handlerFor(deps);

  const denied = await handle(
    editorRequest("/api/site-editor/drafts", {
      method: "PUT",
      body: JSON.stringify({ id: "hero.title", content: { type: "text", value: "Nope" } }),
    }),
  );
  assert.equal(denied.status, 401);

  const stranger = await handle(
    editorRequest("/api/site-editor/auth/request", {
      method: "POST",
      body: JSON.stringify({ email: "stranger@example.com" }),
    }),
  );
  assert.equal(stranger.status, 403);

  const requested = await handle(
    editorRequest("/api/site-editor/auth/request", {
      method: "POST",
      body: JSON.stringify({ email: "Client@Example.com" }),
    }),
  );
  assert.equal(requested.status, 200);
  assert.equal(email.sent.length, 1);
  const token = new URL(email.sent[0]!.url).searchParams.get("token");
  const callback = await handle(
    new Request(`http://localhost/api/site-editor/auth/callback?token=${token}`),
  );
  assert.equal(callback.status, 303);
  const cookie = callback.headers.get("set-cookie") ?? "";
  assert.match(cookie, /site_editor_session=/);

  await seedSpot(deps.content, "demo", "hero.title", "Initial text", { maxTextLength: 80, maxSpots: 20 });
  const saved = await handle(
    editorRequest("/api/site-editor/drafts", {
      method: "PUT",
      headers: { cookie: cookie.split(";")[0] ?? "" },
      body: JSON.stringify({ id: "hero.title", content: { type: "text", value: "Signed in" } }),
    }),
  );
  assert.equal(saved.status, 200);
  const spot = await (deps.content as MemoryContentStore).getSpot("demo", "hero.title");
  assert.equal(spot?.draft.value, "Signed in");
  assert.equal(spot?.published?.value, "Initial text");
});

test("oversized text, image payloads, and repeated logins are rejected", async () => {
  const deps = testDeps({
    config: testConfig({ openEditing: true, maxTextLength: 8, loginEmailLimit: 2, saveLimit: 20 }),
  });
  await seedSpot(deps.content, "demo", "hero.title", "Hi", { maxTextLength: 8, maxSpots: 20 });
  const handle = handlerFor(deps);

  const tooLong = await handle(
    editorRequest("/api/site-editor/drafts", {
      method: "PUT",
      body: JSON.stringify({ id: "hero.title", content: { type: "text", value: "123456789" } }),
    }),
  );
  assert.equal(tooLong.status, 400);

  const image = await handle(
    editorRequest("/api/site-editor/drafts", {
      method: "PUT",
      body: JSON.stringify({ id: "hero.title", content: { type: "image", src: "/a.png", alt: "A" } }),
    }),
  );
  assert.equal(image.status, 400);

  const huge = await handle(
    editorRequest("/api/site-editor/drafts", {
      method: "PUT",
      headers: { "content-length": "99999" },
      body: JSON.stringify({ id: "hero.title", content: { type: "text", value: "ok" } }),
    }),
  );
  assert.equal(huge.status, 413);

  const missingHeader = await handle(
    new Request("http://localhost/api/site-editor/publish", { method: "POST", body: "{}" }),
  );
  assert.equal(missingHeader.status, 403);

  deps.config = testConfig({
    openEditing: false,
    allowedEmails: "client@example.com",
    loginEmailLimit: 2,
  });
  const limited = handlerFor(deps);
  for (let i = 0; i < 2; i += 1) {
    const ok = await limited(
      editorRequest("/api/site-editor/auth/request", {
        method: "POST",
        body: JSON.stringify({ email: "client@example.com" }),
      }),
    );
    assert.equal(ok.status, 200);
  }
  const blocked = await limited(
    editorRequest("/api/site-editor/auth/request", {
      method: "POST",
      body: JSON.stringify({ email: "client@example.com" }),
    }),
  );
  assert.equal(blocked.status, 429);
});

test("restore returns the site to an older published version", async () => {
  const deps = testDeps();
  const handle = handlerFor(deps);
  await seedSpot(deps.content, "demo", "hero.title", "One", { maxTextLength: 80, maxSpots: 20 });
  assert.equal((await handle(editorRequest("/api/site-editor/publish", { method: "POST", body: "{}" }))).status, 200);
  await handle(
    editorRequest("/api/site-editor/drafts", {
      method: "PUT",
      body: JSON.stringify({ id: "hero.title", content: { type: "text", value: "Two" } }),
    }),
  );
  assert.equal((await handle(editorRequest("/api/site-editor/publish", { method: "POST", body: "{}" }))).status, 200);

  const restored = await handle(
    editorRequest("/api/site-editor/versions/restore", {
      method: "POST",
      body: JSON.stringify({ version: 1 }),
    }),
  );
  assert.equal(restored.status, 200);
  const body = (await (
    await handle(editorRequest("/api/site-editor/content"))
  ).json()) as { published: Record<string, { value: string }> };
  assert.equal(body.published["hero.title"]?.value, "One");

  const undone = await handle(editorRequest("/api/site-editor/versions/undo", { method: "POST", body: "{}" }));
  assert.equal(undone.status, 200);
  const again = (await (
    await handle(editorRequest("/api/site-editor/content"))
  ).json()) as { published: Record<string, { value: string }> };
  assert.equal(again.published["hero.title"]?.value, "Two");
});
