# Contributing

Thanks for looking at Site Editor. The project is maintained by The React Native Rewind.

## Setup

Node.js 20 or newer.

```bash
npm install
docker compose up -d
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/site_editor
npm run migrate
npm run dev
```

The demo is http://localhost:3000. `npm run dev` builds the package, then starts Next.js.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run test:postgres` runs the integration test against `DATABASE_URL`. It creates a throwaway site id and deletes it.

Do not publish the package to npm from a pull request. Publishing is a maintainer step and is not wired up in CI.

## Pull requests

- Open the PR against `main`. Do not push to `main` directly.
- Describe what a client or a developer can do after the change.
- Add or update a test when you change seeding, drafts, publish, restore, auth, or rate limits.
- Keep `<Editable>` text-only unless the change is explicitly the image or spacing work on the roadmap.
- Match the existing TypeScript style: strict, small modules, no new dependencies unless the feature needs them.

## Design notes

- The string inside `<Editable>` is a seed, not a live fallback, once Postgres has the spot.
- If `DATABASE_URL` is missing, or the database is unreachable and no snapshot exists, render that seed so the page is not blank.
- Preview (`VERCEL_ENV=preview`) and local development may edit without a login. Record the actor as `preview`. Production stores the allowlisted email.
- Publish must revalidate the Next.js cache. A database write alone leaves the previous page cached.

## Conduct

Be kind. [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) applies to issues, pull requests, and any other project space.
