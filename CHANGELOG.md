# Changelog

All notable changes to Site Editor are documented here. The package is not yet published to npm. Versions below describe the source on `main`.

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
