# Inplace

![Changing a headline and publishing it](docs/demo.gif)

**You build the site with an agent. Your client changes the words on the live page, in seconds, without calling the agent back.**

Inplace is a small open-source add-on from [The React Native Rewind](https://github.com/the-react-native-rewind/inplace). It is for sites that an agent already built, in Cursor, Claude Code, Grok, or whatever you use. The owner points at a sentence, types, and hits Publish. There is no pull request and no rebuild. Images and spacing are on the way. Text works today.

## How it works

You (or your agent) mark the sentences that are allowed to change. Everything else stays in the code, where it belongs.

On a preview link, those sentences are ready to edit. On the real site, the owner signs in with their email, then edits the same way. Publish updates the live page in a moment. Drafts stay private until then. If they publish something they dislike, the previous versions are still stored and an agent can put one back.

## Add Inplace to your agent

Paste this into the agent’s instructions, or point it at [AGENTS.md](https://github.com/the-react-native-rewind/inplace/blob/main/AGENTS.md) (the same text is at [docs/agent-skill.md](https://github.com/the-react-native-rewind/inplace/blob/main/docs/agent-skill.md)).

```md
Add Inplace so the owner can edit marked copy on the live site.

Install with pnpm or Yarn (npm cannot):
pnpm add "@thereactnativerewind/inplace@github:the-react-native-rewind/inplace#main&path:packages/inplace"

Next.js: add app/api/inplace/[...path]/route.ts that re-exports GET, POST, PUT, DELETE from @thereactnativerewind/inplace/next. Wrap the root layout in InplaceProvider and InplaceFrame from @thereactnativerewind/inplace and @thereactnativerewind/inplace/server, using getInplaceBootstrap(). Mark owner-editable copy with <Editable id="stable.id">seed text</Editable>. The child must be a plain string. Never change an id after it is published.

Astro: output server, @astrojs/vercel (Astro 5 uses adapter 9). Add src/pages/api/inplace/[...path].ts with prerender = false, re-exporting the handlers from @thereactnativerewind/inplace/astro. On each editable page set prerender = false, call applyEditableCacheHeaders(Astro.response), and use Editable.astro. Keep sharp in dependencies.

Database: provision Postgres on Vercel (Neon or Supabase) as DATABASE_URL for Production, Preview, and build. Set INPLACE_ALLOWED_EMAILS, RESEND_API_KEY, and INPLACE_FROM_EMAIL for production login. Run: DATABASE_URL="postgres://..." npx inplace migrate

Only wrap text the owner should change. Do not put secrets in editable copy. Preview URLs can be edited without a login.
```

Or just tell your agent:

**Add Inplace to this site so I can edit the copy.**

## What clients see

On a preview link, the words are ready to edit and a small **Publish** button sits at the bottom. It stays quiet until something actually changed, then it says how many changes are waiting. Publish does not reload the page. For a moment the button says **Published**.

On the live site, visitors do not see that button. The owner opens `/?inplace=login`, types the email you allowed, and follows the link. After that they edit the same way. Sign out is tucked in a small menu. A chevron hides the bar if they want the page to look ordinary while they read.

## FAQ

**Will this change the design?**
No. It only changes sentences you marked.

**Does the owner need GitHub, or the agent?**
No. They need the site and, on the live site, their email.

**What if they publish a mistake?**
The old wording is kept. Ask your agent to restore it, or see the [version API](docs/api.md) if you are the one writing the script.

**What if the database is down?**
Visitors still see the last published words, or the original sentence if nothing has been published yet.

## Roadmap

- Images, from an upload or a link, with a description for screen readers.
- Spacing, so padding and margin can move a little without editing CSS.
- More than one language on the same page.

## For developers

Install steps, environment variables, and how the data is stored:

- [Next.js](docs/nextjs.md)
- [Astro](docs/astro.md)
- [Configuration](docs/configuration.md)
- [Security and CSP](docs/security.md)
- [Version API](docs/api.md)
- [Architecture](docs/architecture.md)
- [Compatibility](docs/compatibility.md)

Inplace is maintained by The React Native Rewind. The license is [MIT](LICENSE). [Contributing](CONTRIBUTING.md). [Security reports](SECURITY.md).
