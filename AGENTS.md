# Add Inplace to this site

Inplace lets the site’s owner change marked copy on the live site. You install it, mark the spots, and connect Postgres. After that they do not need you, a pull request, or a rebuild.

Repository: https://github.com/the-react-native-rewind/inplace
Package: `@thereactnativerewind/inplace`
Developer notes: [docs/nextjs.md](docs/nextjs.md), [docs/astro.md](docs/astro.md), [docs/configuration.md](docs/configuration.md)

## Install

The package is not on npm yet. Use pnpm or Yarn. npm ignores the `path:` segment.

```bash
pnpm add "@thereactnativerewind/inplace@github:the-react-native-rewind/inplace#main&path:packages/inplace"
```

## Next.js

1. Add `app/api/inplace/[...path]/route.ts`:

```ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export { DELETE, GET, POST, PUT } from "@thereactnativerewind/inplace/next";
```

2. Wrap the root layout:

```tsx
import { InplaceProvider } from "@thereactnativerewind/inplace";
import { InplaceFrame, getInplaceBootstrap } from "@thereactnativerewind/inplace/server";

<InplaceProvider bootstrap={getInplaceBootstrap()}>
  <InplaceFrame>{children}</InplaceFrame>
</InplaceProvider>
```

3. Mark copy the owner should be able to change. The child must be a plain string. The `id` must stay stable forever. Do not generate ids from the text.

```tsx
import { Editable } from "@thereactnativerewind/inplace/server";

<Editable id="hero.title">Rooms that hold the light.</Editable>
```

## Astro

Use `output: "server"` and `@astrojs/vercel`. Astro 5 needs adapter 9.x, not 11.

1. Add `src/pages/api/inplace/[...path].ts` with `export const prerender = false` and re-export `ALL, DELETE, GET, POST, PUT` from `@thereactnativerewind/inplace/astro`.
2. On each page that has editable copy, set `export const prerender = false`, call `applyEditableCacheHeaders(Astro.response)` in the frontmatter, and use `@thereactnativerewind/inplace/astro/Editable.astro`.
3. Put runtime packages such as `sharp` in `dependencies`, not `devDependencies`.

## Database on Vercel

1. Add Postgres from the Vercel Marketplace (Neon or Supabase) so the project has `DATABASE_URL` for Production, Preview, and the build.
2. For production sign-in, set `INPLACE_ALLOWED_EMAILS` to the owner’s email, plus `RESEND_API_KEY` and `INPLACE_FROM_EMAIL` from a verified Resend domain.
3. Apply the schema:

```bash
DATABASE_URL="postgres://..." npx inplace migrate
```

The first request also applies pending migrations unless `INPLACE_AUTO_MIGRATE=0`. An older database named `site_editor_*` is renamed to `inplace_*` by that migration. Existing `SITE_EDITOR_*` environment variables still work if the `INPLACE_*` name is unset.

## Rules

- Only wrap text the owner should change. Leave layout, code, and secrets alone.
- Never change an `id` after it has been published. Changing the seed string in code does not change the live words after the first save.
- Do not commit secrets. Do not print `DATABASE_URL`.
- Preview URLs are open to edit without a login. Say that to the owner. Production uses `/?inplace=login`.
