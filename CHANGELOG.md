# Changelog

All notable changes to Inplace are documented here. The package is not yet published to npm. Versions below describe the source on `main`.

## 0.3.0

Inplace is the new name of Site Editor. Upgrade an existing install, then run migrations (or deploy and let the first request apply them).

- Package: `@thereactnativerewind/inplace`. Import the Next.js route from `@thereactnativerewind/inplace/next` (`./route` still works). Astro stays at `@thereactnativerewind/inplace/astro`. Styles are `@thereactnativerewind/inplace/styles.css`.
- CLI: `npx inplace migrate`. `npx site-editor migrate` still runs the same command.
- Environment: `INPLACE_SITE_ID`, `INPLACE_ALLOWED_EMAILS`, `INPLACE_FROM_EMAIL`, `INPLACE_URL`, `INPLACE_OPEN`, `INPLACE_REVALIDATE_PATHS`, `INPLACE_SNAPSHOT_PATH`, `INPLACE_MAX_TEXT_LENGTH`, `INPLACE_AUTO_MIGRATE`, and the other `INPLACE_*` limits. Each `SITE_EDITOR_*` variable still works if the new name is unset.
- Routes: mount `/api/inplace/[...path]`. `/api/site-editor/[...path]` is still served if you leave the old file in place. Sign-in is `/?inplace=login`. `/?site-editor=login` still opens the same dialog.
- Database: migration `003_rename.sql` renames `site_editor_*` tables to `inplace_*` when the new names are absent. Empty leftover `site_editor_*` tables are dropped. Tables that already hold rows under both names are left alone. The rename runs with the other pending migrations under the advisory lock.
- Components: `InplaceProvider`, `InplaceFrame`, and `getInplaceBootstrap`. The previous `SiteEditor*` names and `getEditorBootstrap` remain as aliases.
- Install from git: `github:the-react-native-rewind/inplace#main&path:packages/inplace`.

## 0.2.2

- The toolbar is a single **Publish** button. Spots are editable as soon as a preview or a signed-in session is confirmed. Done, History, and Undo are not in the UI. History, restore, and undo remain on the API ([docs/api.md](docs/api.md)).
- Publish does not reload the page. The button reads **Publish 2 changes** when drafts differ, and **Published** for a moment after it succeeds.
- The toolbar stays hidden, including in CSS, until the session check confirms it should show.
- A database error of any kind during render (including Postgres `42703` from a missing column) serves the snapshot or the seed and logs a warning.
- Pending SQL migrations run on the first request under a Postgres advisory lock. Set `INPLACE_AUTO_MIGRATE=0` to skip that and log `Run npx inplace migrate` instead.
- Note that Astro server output plus Vercel Deployment Protection can break `/_image` on previews.

## 0.2.1

- Install instructions point at `main`.
- Closed editor panels stay hidden when their CSS sets `display`.
- `@thereactnativerewind/inplace/styles.css` can be linked instead of injecting a style tag. The Astro toolbar uses that file so a strict `style-src-elem` does not need `'unsafe-inline'`.
- A missing or unreachable database returns HTTP 503 `{ "enabled": false }` from the session route, and the Edit button hides.
- Page render falls back to seed text instead of returning a server error when the editor cannot read Postgres, the snapshot, or Blob.
- Document that Astro 5 sites should use `@astrojs/vercel` 9.x. Adapter 11 is for Astro 7.

## 0.2.0

- Astro adapter at `@thereactnativerewind/inplace/astro`, with `<Editable>` and a JavaScript toolbar (no React).
- Astro pages are server-rendered and cached at the CDN for a few seconds. Publish purges the `inplace` cache tag.
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
