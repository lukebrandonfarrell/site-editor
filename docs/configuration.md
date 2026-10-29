# Configuration

Set variables on the Vercel project for Production, Preview, and the build. `INPLACE_*` is the name to use. If an `INPLACE_*` variable is unset or empty, the matching `SITE_EDITOR_*` variable is still read. That older name is deprecated.

| Variable | Required | What it does |
| --- | --- | --- |
| `DATABASE_URL` | Yes, once you want edits to stick | Postgres connection string. Localhost skips SSL. Hosted databases use SSL. |
| `INPLACE_SITE_ID` | No | Defaults to `default`. One database can hold many sites. The demo uses `demo`. |
| `INPLACE_ALLOWED_EMAILS` | Production login | Comma-separated client emails. Example: `client@example.com, studio@example.com`. |
| `RESEND_API_KEY` | To email links | [Resend](https://resend.com) API key. If unset, the magic link is logged. |
| `INPLACE_FROM_EMAIL` | With Resend | Verified sender, for example `Inplace <editor@yourdomain.com>`. |
| `INPLACE_URL` | Custom hosts | Public origin for sign-in links, such as `https://example.com`. Vercel hosts and localhost are trusted without it. |
| `INPLACE_OPEN` | No | `1` opens the editor with no login. `0` always requires login. Default: open on `VERCEL_ENV=preview` and local development; login required on `VERCEL_ENV=production`. |
| `INPLACE_REVALIDATE_PATHS` | No | Comma-separated paths to revalidate on publish. Default `/`. Next.js only. |
| `INPLACE_SNAPSHOT_PATH` | No | File or directory for the published snapshot. Default `.inplace/<siteId>.json`, then the temp directory if that path is read-only. Older `.site-editor/` files are still read. |
| `BLOB_READ_WRITE_TOKEN` | Recommended on Vercel | Also writes the snapshot to Vercel Blob so a fresh serverless instance can serve it when Postgres is down. |
| `INPLACE_MAX_TEXT_LENGTH` | No | Characters per spot. Default `8000`. |
| `INPLACE_MAX_BODY_BYTES` | No | Request body cap. Default `32768`. |
| `INPLACE_MAX_SPOTS` | No | Spots per site. Default `200`. |
| `INPLACE_AUTO_MIGRATE` | No | Set to `0` to stop the server applying pending SQL on the first request. The default applies it under a Postgres advisory lock. Either way, a mismatch logs `Run npx inplace migrate` and the page falls back to the snapshot or seed. |
| `VERCEL_ENV` | Set by Vercel | `preview` opens the editor. `production` hides it until sign-in. |

Login, session, save, and publish windows also have `INPLACE_LOGIN_EMAIL_LIMIT`, `INPLACE_LOGIN_EMAIL_WINDOW_MS`, `INPLACE_LOGIN_IP_LIMIT`, `INPLACE_LOGIN_IP_WINDOW_MS`, `INPLACE_SAVE_LIMIT`, `INPLACE_SAVE_WINDOW_MS`, `INPLACE_PUBLISH_LIMIT`, `INPLACE_PUBLISH_WINDOW_MS`, `INPLACE_MAGIC_LINK_TTL_MS`, and `INPLACE_SESSION_TTL_MS`. Defaults are in [security.md](security.md).

`DATABASE_URL` should be available at build time so the first render can seed spots. If it is missing, or the database is unreachable and no snapshot exists, visitors see the seed text from code.

`DATABASE_URL`, `RESEND_API_KEY`, `BLOB_READ_WRITE_TOKEN`, and `VERCEL_*` are unchanged. They are not Inplace-specific.
