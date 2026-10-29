import assert from "node:assert/strict";
import { test } from "node:test";
import { isEmailAllowed, parseAllowlist } from "../src/auth/allowlist.js";
import { isOpenEditing, readConfig } from "../src/config.js";
import { consumeFixedWindow } from "../src/rate-limit.js";
import { isLocalHost, requestOrigin } from "../src/http/origin.js";
import { HttpError } from "../src/errors.js";

test("fixed windows block after the limit and reset when the window ends", () => {
  let entry = null;
  const allowed = [];
  for (let i = 0; i < 3; i += 1) {
    const result = consumeFixedWindow(entry, 1_000 + i, 3, 10_000);
    entry = result.entry;
    allowed.push(result.decision.allowed);
  }
  const blocked = consumeFixedWindow(entry, 1_004, 3, 10_000);
  const reset = consumeFixedWindow(blocked.entry, 12_000, 3, 10_000);
  assert.deepEqual(allowed, [true, true, true]);
  assert.equal(blocked.decision.allowed, false);
  assert.equal(reset.decision.allowed, true);
  assert.equal(reset.entry.hits, 1);
});

test("allowlist matching is case-insensitive and ignores blank config", () => {
  const list = parseAllowlist(" Client@Example.com, other@studio.test ");
  assert.equal(isEmailAllowed("client@example.com", list), true);
  assert.equal(isEmailAllowed("stranger@example.com", list), false);
  assert.equal(parseAllowlist("").size, 0);
});

test("preview deployments are open and production requires login unless overridden", () => {
  assert.equal(isOpenEditing({ VERCEL_ENV: "preview", NODE_ENV: "production" }), true);
  assert.equal(isOpenEditing({ VERCEL_ENV: "production", NODE_ENV: "production" }), false);
  assert.equal(isOpenEditing({ NODE_ENV: "development" }), true);
  assert.equal(isOpenEditing({ NODE_ENV: "production", SITE_EDITOR_OPEN: "1" }), true);
  assert.equal(isOpenEditing({ VERCEL_ENV: "preview", SITE_EDITOR_OPEN: "0" }), false);
});

test("site id defaults and rejects unsafe values", () => {
  assert.equal(readConfig({}).siteId, "default");
  assert.throws(() => readConfig({ SITE_EDITOR_SITE_ID: "../etc" }), /SITE_EDITOR_SITE_ID/);
});

test("magic-link origins reject spoofed hosts off Vercel", () => {
  const req = new Request("http://evil.example/api/site-editor/auth/request", {
    headers: { "x-forwarded-host": "evil.example", "x-forwarded-proto": "https" },
  });
  assert.throws(
    () => requestOrigin(req, {}),
    (error: unknown) => error instanceof HttpError && error.code === "site_url_unconfigured",
  );
  assert.equal(isLocalHost("localhost:3000"), true);
  const local = new Request("http://localhost:3000/api/site-editor/session");
  assert.equal(requestOrigin(local, {}), "http://localhost:3000");
});
