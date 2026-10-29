# Next.js

A Next.js App Router app on Vercel. Node 20 or newer.

The package is not on npm yet. pnpm and Yarn can install it from git. `packages/inplace/dist` is committed so the install does not need a build script. npm ignores the `path:` segment and tries to install the private workspace root.

```bash
pnpm add "@thereactnativerewind/inplace@github:the-react-native-rewind/inplace#main&path:packages/inplace"
```

In this repository the demos depend on the workspace copy directly.

## 1. Mount the API route

```ts
// app/api/inplace/[...path]/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export { DELETE, GET, POST, PUT } from "@thereactnativerewind/inplace/next";
```

`@thereactnativerewind/inplace/route` is the same module. An existing file at `app/api/site-editor/[...path]/route.ts` still works. The handler accepts both paths.

## 2. Wrap the app and mark spots

```tsx
// app/layout.tsx
import { InplaceProvider } from "@thereactnativerewind/inplace";
import { InplaceFrame, getInplaceBootstrap } from "@thereactnativerewind/inplace/server";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <InplaceProvider bootstrap={getInplaceBootstrap()}>
          <InplaceFrame>{children}</InplaceFrame>
        </InplaceProvider>
      </body>
    </html>
  );
}
```

```tsx
// app/page.tsx
import { Editable } from "@thereactnativerewind/inplace/server";

export default function Page() {
  return (
    <h1>
      <Editable id="hero.title">Rooms that hold the light.</Editable>
    </h1>
  );
}
```

The child of `<Editable>` must be a plain string. That string is the seed. `SiteEditorProvider`, `SiteEditorFrame`, and `getEditorBootstrap` are deprecated aliases of the names above.

`getInplaceBootstrap()` defaults the API base to `/api/inplace`. Pass `/api/site-editor` if the route file still lives at the old path.

## 3. Environment and migrate

Set these on the Vercel project for Production, Preview, and the build. See [configuration.md](configuration.md).

```bash
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DB
INPLACE_ALLOWED_EMAILS=client@example.com
RESEND_API_KEY=re_xxxxxxxxx
INPLACE_FROM_EMAIL="Inplace <editor@yourdomain.com>"
```

Provision Postgres from the Vercel Marketplace (Neon or Supabase). Both speak `DATABASE_URL`.

```bash
DATABASE_URL="postgres://..." npx inplace migrate
```

`npx site-editor migrate` runs the same command. In this repo: `npm install && npm run migrate`. Pending SQL also runs on the first request unless `INPLACE_AUTO_MIGRATE=0`.

Open a preview deployment and change the words. **Publish** stays quiet until a draft differs from the live copy. On production, clients open `/?inplace=login`. `/?site-editor=login` still opens the dialog.

The demo in `apps/demo` is this setup. See `apps/demo/vercel.json`. Set the Vercel root directory to `apps/demo` and include source files outside that directory.

```bash
docker compose up -d
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/inplace
npm install
npm run migrate
npm run dev
```

Open http://localhost:3000.

## Cache

Publish calls `revalidateTag` for `inplace` and for the older `site-editor` tag, then `revalidatePath` for `INPLACE_REVALIDATE_PATHS` (default `/`). The page the client is looking at does not reload. The next view reads the published copy.

If `DATABASE_URL` is missing, the database is down, or a query fails for any other reason, the page still renders the snapshot or the seed text and logs a warning. `GET /api/inplace/session` returns HTTP 503 `{ "enabled": false }`. The toolbar stays hidden until that check confirms a preview or a signed-in editor.
