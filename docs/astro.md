# Astro

For an Astro site on `@astrojs/vercel`. The editor core is shared with Next.js. The toolbar is a small script, not a React island.

Install the same way as Next.js. pnpm and Yarn accept the git `path:` segment. npm does not.

```bash
pnpm add "@thereactnativerewind/inplace@github:the-react-native-rewind/inplace#main&path:packages/inplace"
```

## 1. Adapter

Server output, so pages that contain `<Editable>` are rendered on demand.

```js
// astro.config.mjs
import vercel from "@astrojs/vercel";
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "server",
  adapter: vercel(),
});
```

`@astrojs/vercel` 11 expects Astro 7. An Astro 5 site should stay on adapter 9.x (`"@astrojs/vercel": "^9"` with `"astro": "^5"`). The demo in `apps/demo-astro` is built in CI on Astro 5.18 and adapter 9.0.5. The package peer range allows Astro 5 and later, and `@astrojs/vercel` 8 or later, but those two packages still have to match each other. More of that is in [compatibility.md](compatibility.md).

## 2. API route

```ts
// src/pages/api/inplace/[...path].ts
export const prerender = false;

export { ALL, DELETE, GET, POST, PUT } from "@thereactnativerewind/inplace/astro";
```

`export const prerender = false` matters. A static API route will not accept saves. The same handlers also answer `/api/site-editor/[...path]` if that file re-exports them.

## 3. Mark copy

The page must opt out of prerender and set the CDN headers in its frontmatter. A component lower in the body is too late to change them.

```astro
---
// src/pages/index.astro
export const prerender = false;
import { applyEditableCacheHeaders } from "@thereactnativerewind/inplace/astro";
import Editable from "@thereactnativerewind/inplace/astro/Editable.astro";

applyEditableCacheHeaders(Astro.response);
---
<h1><Editable id="hero.title">Rooms that hold the light.</Editable></h1>
```

## 4. Environment and migrate

Same variables as Next.js: `DATABASE_URL`, and for production login `INPLACE_ALLOWED_EMAILS`, `RESEND_API_KEY`, and `INPLACE_FROM_EMAIL`. Use a distinct `INPLACE_SITE_ID` if this site shares a database with another app. `SITE_EDITOR_*` names still work when the new name is unset.

```bash
DATABASE_URL="postgres://..." npx inplace migrate
```

Vercel production installs omit `devDependencies`. Anything the server needs at runtime, including `sharp` if you use Astro image optimization, belongs in `dependencies`.

## Cache

`applyEditableCacheHeaders` sets `Cache-Control: public, max-age=0, s-maxage=5, stale-while-revalidate=30` and tags the response `inplace`. Browsers do not cache the HTML. Vercel’s CDN may cache it for about 5 seconds, and may serve one stale response while it refreshes. Publish calls `invalidateByTag` for `inplace` and the older `site-editor` tag, so a Vercel deployment drops that CDN entry immediately. If the purge cannot run, the old HTML lasts at most a few seconds.

Pages must be server-rendered (`output: 'server'` or `export const prerender = false`). A fully static build would bake the copy until the next deploy.

If `DATABASE_URL` is missing, the database is down, or a query fails, the page still renders the snapshot or the seed text and logs a warning. `GET /api/inplace/session` returns HTTP 503 `{ "enabled": false }`. The toolbar stays hidden until that check confirms a preview or a signed-in editor.

`apps/demo-astro` is this setup. `npm run dev -w inplace-demo-astro` starts it on port 4321.

## Images on protected previews

Astro server output serves optimized images from `/_image`. Vercel Deployment Protection (SSO) does not forward the protection cookie to that route, so those images can break on a preview URL. Point `<img>` at a file in `public/`, or emit the image without the image service, or add a [Deployment Protection bypass](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection) for `/_image`.
