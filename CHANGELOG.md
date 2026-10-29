# Changelog

All notable changes to Site Editor are documented here. The package is not yet published to npm. Versions below describe the source on `main`.

## 0.2.1

- Install instructions point at `main`.
- Closed editor panels stay hidden when their CSS sets `display`.
- `@thereactnativerewind/site-editor/styles.css` can be linked instead of injecting a style tag. The Astro toolbar uses that file so a strict `style-src-elem` does not need `'unsafe-inline'`.
- A missing or unreachable database returns HTTP 503 `{ "enabled": false }` from the session route, and the Edit button hides.
- Page render falls back to seed text instead of returning a server error when the editor cannot read Postgres, the snapshot, or Blob.
- Document that Astro 5 sites should use `@astrojs/vercel` 9.x. Adapter 11 is for Astro 7.

## 0.2.0

- Astro adapter at `@thereactnativerewind/site-editor/astro`, with `<Editable>` and a JavaScript toolbar (no React).
- Astro pages are server-rendered and cached at the CDN for a few seconds. Publish purges the `site-editor` cache tag.
- Demo app in `apps/demo-astro`.
- `dist` is committed so the package can be installed from git before it is on npm.

## 0.1.0

- Inline text editing for spots marked with `<Editable id>`.
- Drafts, publish, version history, undo, and restore.
- Postgres storage via `DATABASE_URL`, with a published snapshot when the database is unreachable.
- Seed text from code is shown when no database is configured and no snapshot exists.
- Versions and drafts record the actor: `preview` on open preview URLs, or the signed-in email.
- Magic-link login for an allowlist of emails, sent with Resend or logged when no API key is set.
- Rate limits and payload caps on saves, publishes, and login requests.
- Next.js cache revalidation on publish so the live page updates without a rebuild.
- Demo app in `apps/demo`.
