# Site Editor

[![CI](https://github.com/lukebrandonfarrell/site-editor/actions/workflows/ci.yml/badge.svg)](https://github.com/lukebrandonfarrell/site-editor/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

![Editing a headline and publishing it live](docs/demo.gif)

**Clients edit the words on a live Next.js or Astro site. Publish shows up in a second or two, with no pull request and no rebuild.**

Site Editor is an open-source plug-in from [The React Native Rewind](https://github.com/lukebrandonfarrell/site-editor). Developers mark the spots that can change. Clients point, type, and publish. Everyone else still sees the site as a normal page.

```tsx
<Editable id="hero.title">Rooms that hold the light.</Editable>
```

## Features

- Inline editing of marked copy only. Unmarked markup stays in code.
- Drafts stay off the public page until **Publish**.
- Version history, undo, and restore stay available as an [API](docs/api.md) for agents and scripts. The toolbar does not show them.
- Postgres is the source of truth (`DATABASE_URL`). Neon and Supabase both work.
- Each publish writes a snapshot. If Postgres is down, that snapshot is what visitors see.
- If there is no database and no snapshot yet, the page renders the seed text from code instead of blank spots.
- Preview deployments (`VERCEL_ENV=preview`) and local dev open the editor with no login. Production requires a magic link to an allowlisted email.
- Resend sends the link. With no API key, the link is printed in the server log.
- Text length, body size, and request rate limits are on by default.
- First-class Next.js and Astro adapters. The Astro toolbar is plain JavaScript, with no React on the page.

## How it works

```mermaid
flowchart TD
  code["Editable seed in code"] --> first["First render creates the spot"]
  first --> db[("Postgres")]
  editor["Type on the page"] --> draft["Save draft"]
  draft --> db
  publish["Publish"] --> db
  publish --> snap["Snapshot file or Vercel Blob"]
  publish --> cache["Next.js revalidate, or Astro CDN tag purge"]
  cache --> page["Live page, within a few seconds"]
  db --> page
  db -.->|unreachable| snap
  snap -.->|no snapshot yet| code
```

The string inside `<Editable>` is a seed. The first time that spot renders against a database, the seed is copied into Postgres. After that, edits in the repo do not change the live words. On a preview URL, or after a client signs in, the words are editable immediately. Publish copies every draft onto the published value, stores a numbered version with the actor (`preview` or the client’s email), writes the snapshot, and tells Next.js to drop the cached page. The page does not reload.

## Five-minute quickstart

A Next.js App Router app on Vercel. Node 20 or newer.

**1. Install**

```bash
npm install @thereactnativerewind/site-editor
```

In this repository the package is the workspace `packages/site-editor`. It is ready to publish and is not published from CI.

**2. Mount the API route**

```ts
// app/api/site-editor/[...path]/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export { DELETE, GET, POST, PUT } from "@thereactnativerewind/site-editor/route";
```

**3. Wrap the app and mark spots**

```tsx
// app/layout.tsx
import { SiteEditorProvider } from "@thereactnativerewind/site-editor";
import { SiteEditorFrame, getEditorBootstrap } from "@thereactnativerewind/site-editor/server";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteEditorProvider bootstrap={getEditorBootstrap()}>
          <SiteEditorFrame>{children}</SiteEditorFrame>
        </SiteEditorProvider>
      </body>
    </html>
  );
}
```

```tsx
// app/page.tsx
import { Editable } from "@thereactnativerewind/site-editor/server";

export default function Page() {
  return (
    <h1>
      <Editable id="hero.title">Rooms that hold the light.</Editable>
    </h1>
  );
}
```

The child of `<Editable>` must be a plain string. That string is the seed.

**4. Set environment variables** on the Vercel project, for Production, Preview, and the build:

```bash
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DB
SITE_EDITOR_ALLOWED_EMAILS=client@example.com
RESEND_API_KEY=re_xxxxxxxxx
SITE_EDITOR_FROM_EMAIL="Site Editor <editor@yourdomain.com>"
```

Provision Postgres from the Vercel Marketplace (Neon or Supabase). Both speak `DATABASE_URL`.

**5. Migrate, then deploy**

```bash
DATABASE_URL="postgres://..." npx site-editor migrate
```

In this repo: `npm install && npm run migrate`. The SQL is safe to run again.

Open a preview deployment and change the words. **Publish** stays quiet until a draft differs from the live copy, then reads **Publish 2 changes**. On production, clients open `/?site-editor=login`.

The demo in `apps/demo` is this setup already. See `apps/demo/vercel.json` for the monorepo install and build commands. Set the Vercel root directory to `apps/demo` and include source files outside that directory.

Try it locally:

```bash
docker compose up -d
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/site_editor
npm install
npm run migrate
npm run dev
```

Open http://localhost:3000.

## Astro quickstart

For an Astro site on `@astrojs/vercel`. The editor core is shared with Next.js. The toolbar is a small script, not a React island.

The package is not on npm yet. Install the workspace package from this branch. `packages/site-editor/dist` is committed so the install does not need a build script. pnpm 10 blocks dependency build scripts unless the package is allowlisted, which is why `dist` ships in git until the package is published.

```json
"@thereactnativerewind/site-editor": "github:lukebrandonfarrell/site-editor#main&path:packages/site-editor"
```

```bash
pnpm add "@thereactnativerewind/site-editor@github:lukebrandonfarrell/site-editor#main&path:packages/site-editor"
```

pnpm and Yarn accept the `path:` segment. npm does not: it ignores it and tries to install the private workspace root. Use pnpm or Yarn until the package is published. In this monorepo the demos depend on the workspace copy directly.

**1. Adapter.** Server output, so pages that contain `<Editable>` are rendered on demand.

```js
// astro.config.mjs
import vercel from "@astrojs/vercel";
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "server",
  adapter: vercel(),
});
```

**2. API route.**

```ts
// src/pages/api/site-editor/[...path].ts
export const prerender = false;

export { ALL, DELETE, GET, POST, PUT } from "@thereactnativerewind/site-editor/astro";
```

**3. Mark copy.** The page must opt out of prerender and set the CDN headers in its frontmatter. A component lower in the body is too late to change them.

```astro
---
// src/pages/index.astro
export const prerender = false;
import { applyEditableCacheHeaders } from "@thereactnativerewind/site-editor/astro";
import Editable from "@thereactnativerewind/site-editor/astro/Editable.astro";

applyEditableCacheHeaders(Astro.response);
---
<h1><Editable id="hero.title">Rooms that hold the light.</Editable></h1>
```

Call `applyEditableCacheHeaders` from the page frontmatter, before any HTML is sent. A component rendered in the body is too late to set CDN headers.

**4. Environment and migrate.** Same variables as Next.js: `DATABASE_URL`, and for production login `SITE_EDITOR_ALLOWED_EMAILS`, `RESEND_API_KEY`, and `SITE_EDITOR_FROM_EMAIL`. Use a distinct `SITE_EDITOR_SITE_ID` if this site shares a database with another app.

```bash
DATABASE_URL="postgres://..." npx site-editor migrate
```

**Adapter compatibility.** `@astrojs/vercel` 11 expects Astro 7. An Astro 5 site should stay on adapter 9.x (`"@astrojs/vercel": "^9"` with `"astro": "^5"`). The demo in `apps/demo-astro` is built in CI on Astro 5.18 and adapter 9.0.5. The package peer range allows Astro 5 and later, and `@astrojs/vercel` 8 or later, but those two packages still have to match each other.

**Production install.** Vercel production installs omit `devDependencies`. Anything the server needs at runtime, including `sharp` if you use Astro image optimization, belongs in `dependencies`.

**Images on protected previews.** Astro server output serves optimized images from `/_image`. Vercel Deployment Protection (SSO) does not forward the protection cookie to that route, so those images can break on a preview URL. Point `<img>` at a file in `public/`, or emit the image without the image service, or add a [Deployment Protection bypass](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection) for `/_image`.

**Styles and CSP.** The Astro component imports `@thereactnativerewind/site-editor/styles.css`, which Vite emits as a stylesheet URL, and it does not inject a `<style>` tag. Link that file yourself if you mount the script by hand, and call `mountSiteEditor({ injectStyles: false })` or set `<meta name="site-editor-styles" content="external" />`. The Next.js provider injects the same CSS by default; pass `injectStyles={false}` and import `styles.css` when you have a strict policy. Injecting a style tag requires `style-src-elem 'unsafe-inline'` (or a hash of that file). A linked stylesheet only needs `style-src-elem 'self'`.

**Cache tradeoff.** `applyEditableCacheHeaders` sets `Cache-Control: public, max-age=0, s-maxage=5, stale-while-revalidate=30` and tags the response `site-editor`. Browsers do not cache the HTML. Vercel’s CDN may cache it for about 5 seconds, and may serve one stale response while it refreshes. Publish calls `invalidateByTag("site-editor")`, so a Vercel deployment drops that CDN entry immediately and the next view is fresh. If the purge cannot run, the old HTML lasts at most a few seconds. Pages must be server-rendered (`output: 'server'` or `export const prerender = false`). A fully static build would bake the copy until the next deploy. If `DATABASE_URL` is missing, the database is down, or a query fails for any other reason (including a schema that is behind the code), the page still renders the snapshot or the seed text and logs a warning. `GET /api/site-editor/session` returns HTTP 503 with `{ "enabled": false }`. The toolbar stays hidden until that session check confirms a preview or a signed-in editor. The first request also applies pending migrations unless `SITE_EDITOR_AUTO_MIGRATE=0`.

`apps/demo-astro` is this setup. `npm run dev -w site-editor-demo-astro` starts it on port 4321.

## Configuration

| Variable | Required | What it does |
| --- | --- | --- |
| `DATABASE_URL` | Yes, once you want edits to stick | Postgres connection string. Localhost skips SSL. Hosted databases use SSL. |
| `SITE_EDITOR_SITE_ID` | No | Defaults to `default`. One database can hold many sites. The demo uses `demo`. |
| `SITE_EDITOR_ALLOWED_EMAILS` | Production login | Comma-separated client emails. Example: `client@example.com, studio@example.com`. |
| `RESEND_API_KEY` | To email links | [Resend](https://resend.com) API key. If unset, the magic link is logged. |
| `SITE_EDITOR_FROM_EMAIL` | With Resend | Verified sender, for example `Site Editor <editor@yourdomain.com>`. |
| `SITE_EDITOR_URL` | Custom hosts | Public origin for sign-in links, such as `https://example.com`. Vercel hosts and localhost are trusted without it. |
| `SITE_EDITOR_OPEN` | No | `1` opens the editor with no login. `0` always requires login. Default: open on `VERCEL_ENV=preview` and local development; login required on `VERCEL_ENV=production`. |
| `SITE_EDITOR_REVALIDATE_PATHS` | No | Comma-separated paths to revalidate on publish. Default `/`. |
| `SITE_EDITOR_SNAPSHOT_PATH` | No | File or directory for the published snapshot. Default `.site-editor/<siteId>.json`, then the temp directory if that path is read-only. |
| `BLOB_READ_WRITE_TOKEN` | Recommended on Vercel | Also writes the snapshot to Vercel Blob so a fresh serverless instance can serve it when Postgres is down. |
| `SITE_EDITOR_MAX_TEXT_LENGTH` | No | Characters per spot. Default `8000`. |
| `SITE_EDITOR_AUTO_MIGRATE` | No | Set to `0` to stop the server applying pending SQL on the first request. The default applies it under a Postgres advisory lock. Either way, a mismatch logs `Run npx site-editor migrate` and the page falls back to the snapshot or seed. |
| `VERCEL_ENV` | Set by Vercel | `preview` opens the editor. `production` hides it until sign-in. |

`DATABASE_URL` should be available at build time so the first render can seed spots. If it is missing, or the database is unreachable and no snapshot exists, visitors see the seed text from code.

## Auth and security

- **Preview and local dev.** Anyone with the URL can edit and publish. Do not put secrets in editable copy. Preview URLs are unlisted, not a lock.
- **Production.** The toolbar is hidden. A client opens `/?site-editor=login`, enters an allowlisted email, and receives a one-time link. The link lasts 15 minutes, works once, and sets an httpOnly session cookie for 7 days. After that, the spots are editable and **Publish** is the only primary control. Sign out sits in a small overflow menu.
- **Allowlist.** `SITE_EDITOR_ALLOWED_EMAILS`. An empty list denies every login. Comparison is case-insensitive.
- **Email.** Resend when `RESEND_API_KEY` and `SITE_EDITOR_FROM_EMAIL` are both set. Otherwise the link is printed on the server. Resend’s `onboarding@resend.dev` sender only delivers to the Resend account address. Use a verified domain for clients.
- **Host pinning.** Sign-in links use the Vercel host or localhost. Any other host must match `SITE_EDITOR_URL`, so a forged `Host` header cannot steal the link.
- **Mutations** must be same-origin and send `x-site-editor: 1`. The editor UI does this. Copy is stored and rendered as text, not HTML.
- **Limits.** 8,000 characters per spot, 32 KB per request, 200 spots per site. 60 draft saves per minute per IP. 10 publish, restore, or undo actions per 5 minutes per site. 5 magic-link requests per 15 minutes per email, and 30 per 15 minutes per IP.

Report vulnerabilities through [GitHub security advisories](https://github.com/lukebrandonfarrell/site-editor/security/advisories). See [SECURITY.md](SECURITY.md).

## Data model

Every spot stores a tagged value. Version 1 accepts text only:

```ts
{ type: "text", value: "Rooms that hold the light." }
```

Versions are a map of those values plus an `actor` (`preview` or the session email) and an optional `restoredFrom` version number. Draft rows remember `updated_by` the same way.

The tag is there so later types do not need a new table:

- **Images.** `{ type: "image", src: string, alt: string }`
- **Spacing.** `{ type: "spacing", padding: BoxEdges, margin: BoxEdges }`

Unknown types are rejected on write.

## FAQ

**Does changing the string in code update the live site?**
Only the first time that spot is created, and only when a database is configured. After that, Postgres wins. Change the words in the editor, or delete the row if you truly want the seed copied again.

**What do visitors see if Postgres is down?**
The last published snapshot. If no snapshot has been written yet, they see the seed text from code, not an empty page.

**Why didn’t my draft show up on the live site?**
Drafts are private to the editor. Publish promotes them, writes a version, and revalidates the Next.js cache. The page you are looking at does not reload; the next view picks up the published text.

**How do I restore an older version?**
The toolbar does not list history. Agents and scripts call the [version API](docs/api.md).

**Who is “preview” in the history?**
An edit made on a preview deployment or in local dev, where the editor is open without a login. Production history shows the allowlisted email.

**Can I run two sites on one database?**
Yes. Set a different `SITE_EDITOR_SITE_ID` for each app.

## Roadmap

- Image spots, chosen from an upload or a URL, with alt text.
- Spacing spots so clients can nudge padding and margin without editing CSS.
- Richer text (links and a few marks) where a spot needs it. Plain text stays the default so published copy cannot inject HTML.

## Development

```bash
npm install
npm test
npm run typecheck
npm run build
```

`npm run test:postgres` needs `DATABASE_URL`. Docker Compose in this repo starts Postgres on port 5432.

See [CONTRIBUTING.md](CONTRIBUTING.md) for pull requests. The license is [MIT](LICENSE).

Screenshots of the demo: [the publish bar](docs/edit-button.png), [inline editing](docs/inline-edit.png), [Publish with pending changes](docs/toolbar-publish.png), and [the Published confirmation](docs/version-history.png).
