# Site Editor

Site Editor is an open-source, plug-in visual editor for Next.js sites hosted on Vercel. Non-technical clients point at copy, change it, and publish. The live page updates within a second or two. There is no pull request, no agent, and no rebuild in the loop.

Clients can only change spots a developer marked. Everything else on the page stays in code.

```tsx
<Editable id="hero.title">Rooms that hold the light.</Editable>
```

The string in code is a **seed**. The first time that spot is rendered it is stored in Postgres. After that the database is the only source of truth — editing the string in the repo does not change the live site. Each publish also writes a snapshot of the published content, and that snapshot is what the site serves if Postgres is unreachable.

Version 1 stores text only, in a shape that can grow later:

```ts
{ type: "text", value: "Rooms that hold the light." }
```

## How publishing works

1. A client edits a spot. The change is saved as a **draft** and is not what visitors see.
2. **Publish** copies every draft onto the published value, stores a numbered version, and writes a snapshot.
3. The API route calls `revalidateTag("site-editor")` and `revalidatePath` (default `/`). Vercel drops the cached page, the next request reads the new published text, and the live site updates within a second or two.
4. **History** lists published versions. **Restore** makes an older version live again by writing a new version (it does not erase history). **Undo** restores the previous published version the same way.

Spots that did not exist in the restored version stay in the database with an empty published value, so the original seed in code cannot silently come back.

## Repository layout

```
apps/demo                         Next.js marketing page that uses the editor
packages/site-editor              publishable package @thereactnativerewind/site-editor
  src/                            editor UI, content rules, Postgres store, HTTP API
  migrations/001_init.sql         idempotent schema
  test/                           versioning, auth, rate limits, snapshot fallback
```

The package is set up to publish to npm. This repo does not publish it for you.

## Install into a Next.js app

Peer dependencies are `next`, `react`, and `react-dom`. `pg` and `resend` are dependencies of the package.

```bash
npm install @thereactnativerewind/site-editor
```

Wrap the app in the provider and the frame. The frame reads published content on the server. The provider is the floating editor.

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

Mount the API route exactly once:

```ts
// app/api/site-editor/[...path]/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export { GET, POST, PUT, DELETE } from "@thereactnativerewind/site-editor/route";
```

Mark copy. The child must be a plain string — that string is the seed, not a fallback.

```tsx
import { Editable } from "@thereactnativerewind/site-editor/server";

export default function Page() {
  return (
    <h1>
      <Editable id="hero.title">Rooms that hold the light.</Editable>
    </h1>
  );
}
```

Spot ids are 1–128 characters: letters, numbers, `.`, `_`, `:`, and `-`.

Apply the schema once per database:

```bash
export DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DB
npx site-editor migrate
```

In this monorepo, from the repository root:

```bash
docker compose up -d
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/site_editor
npm install
npm run migrate
npm run dev
```

`npm run migrate` builds the package, then runs `migrations/001_init.sql`. The SQL is safe to run again. If `apps/demo/.env` or `./.env` defines `DATABASE_URL`, the migrate command picks it up.

Run the demo:

```bash
npm run dev
```

Open http://localhost:3000. Local `next dev` shows the **Edit** button with no login. Change a headline, click **Publish**, and reload — the new text is served from Postgres. **History** restores an older published version. Drafts do not appear for visitors until publish.

## Environment variables

Set these on the Vercel project (Production and Preview). `DATABASE_URL` must also be available at **build** time so the first render can seed spots.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection string. Neon or Supabase from the Vercel Marketplace both work. Localhost skips SSL; hosted databases use SSL. |
| `SITE_EDITOR_ALLOWED_EMAILS` | Production login | Comma-separated client emails allowed to request a magic link. Example: `client@example.com, studio@example.com`. |
| `RESEND_API_KEY` | Production email | [Resend](https://resend.com) API key. If it is unset, the magic link is printed in the server log instead of emailed. |
| `SITE_EDITOR_FROM_EMAIL` | With Resend | Verified sender, for example `Site Editor <editor@yourdomain.com>`. |
| `SITE_EDITOR_SITE_ID` | No | Defaults to `default`. One database can store many sites. The demo uses `demo`. |
| `SITE_EDITOR_URL` | Custom hosts | Public origin for sign-in links, such as `https://your-domain.com`. On Vercel the request host is trusted. Off Vercel, anything that is not localhost must match this (or `VERCEL_URL` / `VERCEL_PROJECT_PRODUCTION_URL`). |
| `SITE_EDITOR_OPEN` | No | `1` shows the editor with no login. `0` always requires login. Default: open when `VERCEL_ENV=preview` or when running locally in development; login required when `VERCEL_ENV=production`. |
| `SITE_EDITOR_REVALIDATE_PATHS` | No | Comma-separated paths to revalidate on publish. Default `/`. |
| `SITE_EDITOR_SNAPSHOT_PATH` | No | File or directory for the published snapshot. Default is `.site-editor/<siteId>.json` in the working directory, then the system temp directory if that path is not writable. |
| `BLOB_READ_WRITE_TOKEN` | Recommended on Vercel | When set, publish also writes the snapshot to Vercel Blob. Blob is shared across serverless instances, so a database outage still has a copy to serve. Without it, Vercel’s read-only filesystem means the file snapshot only lands in `/tmp` on the instance that published. |
| `SITE_EDITOR_MAX_TEXT_LENGTH` | No | Max characters per spot. Default `8000`. |
| `VERCEL_ENV` | Set by Vercel | `preview` opens the editor with no login. `production` hides it until a client is signed in. |

Vercel also sets `VERCEL`, `VERCEL_URL`, and `VERCEL_PROJECT_PRODUCTION_URL`. Do not invent those.

### Demo on Vercel

`apps/demo/vercel.json` sets the install and build commands. In the Vercel project:

1. Framework preset: Next.js
2. Root Directory: `apps/demo`
3. Include source files outside the root directory (the workspace package lives in `packages/site-editor`)

The commands in `vercel.json` install from the repository root, build the editor package, then run `next build` in `apps/demo`.

Set these environment variables for Production and Preview, and make `DATABASE_URL` available to the **build** as well as runtime:

- `DATABASE_URL` (required)
- `SITE_EDITOR_SITE_ID=demo`
- `SITE_EDITOR_ALLOWED_EMAILS`, `RESEND_API_KEY`, and `SITE_EDITOR_FROM_EMAIL` for production sign-in
- `BLOB_READ_WRITE_TOKEN` so the published snapshot survives a database outage on a fresh serverless instance

After the database exists, apply the schema once from any machine that can reach it:

```bash
DATABASE_URL="postgres://..." npm run migrate
```

## Auth

- **Preview** (`VERCEL_ENV=preview`) and **local dev**: the Edit button is on the page. Anyone with the preview URL can change drafts and publish. Do not put secrets in editable copy.
- **Production**: the button is hidden. The client opens `/?site-editor=login`, enters an allowlisted email, and gets a one-time link (15 minutes). The link sets an httpOnly session cookie for 7 days. After that, the Edit button is available.
- The sender is pluggable (`EmailSender`). Resend is the default when `RESEND_API_KEY` and `SITE_EDITOR_FROM_EMAIL` are both set. Otherwise the link is logged. Resend’s `onboarding@resend.dev` sender only delivers to the address on the Resend account — use a verified domain for real clients.

Sign-in links use the Vercel host or localhost. Other hosts need `SITE_EDITOR_URL`, so a forged `Host` header cannot redirect the magic link.

## Limits

Defaults, overridable with the env vars above:

- 8,000 characters per text spot, 32 KB per request body, 200 spots per site
- 60 draft saves per minute per IP
- 10 publish/restore/undo actions per 5 minutes per site
- 5 magic-link requests per 15 minutes per email, 30 per 15 minutes per IP

Mutations must come from the same origin and send `x-site-editor: 1`. The editor UI does this. Text is stored and rendered as text, not HTML.

## Snapshot when Postgres is down

Publish writes, in order:

1. The version and published spots in Postgres (source of truth).
2. A JSON file (`.site-editor/<siteId>.json`, or `SITE_EDITOR_SNAPSHOT_PATH`, or the temp directory if the disk is read-only).
3. A private Vercel Blob at `site-editor/<siteId>/snapshot.json` when `BLOB_READ_WRITE_TOKEN` is set.

Reads try Postgres first, through Next.js `unstable_cache` tagged `site-editor`. If the connection fails, the render serves the snapshot file or Blob and does **not** show the seed string from code. The page is not frozen as an empty static shell in that case.

On Vercel without Blob, `/tmp` is per instance and ephemeral. Use Blob if a database outage must still show the last published copy on a fresh instance. While the data cache is warm, Vercel can also keep serving the last successful render until the tag is revalidated.

## Tests

```bash
npm test
```

Core coverage: seed-once, draft vs published, publish snapshots, restore, undo, text-only validation, magic-link allowlist, rate limits, and snapshot fallback.

Against a real Postgres (Docker Compose in this repo):

```bash
docker compose up -d
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/site_editor
npm run test:postgres
```

## Roadmap

V1 is text only. The stored JSON is a tagged object so later types can land without a migration of the table shape:

- **Image** — `{ type: "image", src: string, alt: string }`, chosen from an upload or URL, rendered in place of a text spot.
- **Spacing** — `{ type: "spacing", padding: { top, right, bottom, left }, margin: { top, right, bottom, left } }` so clients can nudge layout without editing CSS.
- Richer text (marks, links) if a spot needs it. Plain text stays the default so published copy cannot inject HTML.

## License

[MIT](./LICENSE)
