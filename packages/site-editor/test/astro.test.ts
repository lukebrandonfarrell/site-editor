import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  EDITABLE_CACHE_CONTROL,
  applyEditableCacheHeaders,
  createAstroHandlers,
  prerender,
} from "../src/astro/index.ts";
import { mountSiteEditor } from "../src/astro/editor-client.ts";
import { resolveEditableText } from "../src/content/published.ts";
import { seedSpot } from "../src/content/service.ts";
import { editorRequest, handlerFor, testDeps } from "./helpers.ts";

test("astro routes are server-rendered and publish through the shared handler", async () => {
  assert.equal(prerender, false);
  const deps = testDeps();
  let revalidated = 0;
  deps.revalidate = () => {
    revalidated += 1;
  };
  await seedSpot(deps.content, "demo", "hero.title", "Seed", { maxTextLength: 80, maxSpots: 20 });
  const api = createAstroHandlers(deps);
  const saved = await api.PUT({
    request: editorRequest("/api/site-editor/drafts", {
      method: "PUT",
      body: JSON.stringify({ id: "hero.title", content: { type: "text", value: "From Astro" } }),
    }),
  });
  assert.equal(saved.status, 200);
  assert.equal((await api.POST({
    request: editorRequest("/api/site-editor/publish", { method: "POST", body: "{}" }),
  })).status, 200);
  assert.equal(revalidated, 1);
  const history = (await (
    await api.GET({ request: editorRequest("/api/site-editor/versions") })
  ).json()) as { versions: Array<{ actor: string }> };
  assert.equal(history.versions[0]?.actor, "preview");
  const content = (await (
    await api.ALL({ request: editorRequest("/api/site-editor/content") })
  ).json()) as { published: Record<string, { value: string }> };
  assert.equal(content.published["hero.title"]?.value, "From Astro");
});

test("editable pages advertise a short tagged CDN cache", () => {
  const headers = new Headers();
  applyEditableCacheHeaders({ headers });
  applyEditableCacheHeaders({ headers });
  assert.equal(headers.get("Cache-Control"), EDITABLE_CACHE_CONTROL);
  assert.match(headers.get("Cache-Control") ?? "", /s-maxage=5/);
  assert.match(headers.get("Vercel-CDN-Cache-Control") ?? "", /stale-while-revalidate=30/);
  assert.equal(headers.get("Vercel-Cache-Tag"), "site-editor");
  assert.equal(typeof mountSiteEditor, "function");
  const component = readFileSync(new URL("../astro/Editable.astro", import.meta.url), "utf8");
  assert.match(component, /data-site-editor-spot/);
  assert.match(component, /resolveEditableText/);
});

test("missing DATABASE_URL renders the code seed", async () => {
  const previous = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    assert.equal(await resolveEditableText("hero.title", "  Seed from code  "), "Seed from code");
  } finally {
    if (previous) process.env.DATABASE_URL = previous;
  }
});

test("the astro ALL handler is the same router the Next adapter uses", async () => {
  const deps = testDeps({ config: { ...testDeps().config, openEditing: false } });
  const api = createAstroHandlers(deps);
  const next = handlerFor(deps);
  const deniedAstro = await api.POST({
    request: editorRequest("/api/site-editor/publish", { method: "POST", body: "{}" }),
  });
  const deniedNext = await next(editorRequest("/api/site-editor/publish", { method: "POST", body: "{}" }));
  assert.equal(deniedAstro.status, 401);
  assert.equal(deniedNext.status, 401);
});
