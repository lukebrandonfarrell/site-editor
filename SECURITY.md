# Security policy

## Supported versions

Security fixes land on `main` and ship in the next release of `@thereactnativerewind/site-editor`. The package is not yet published to npm. Treat the `main` branch as the supported line.

## Reporting a vulnerability

Please report vulnerabilities privately through [GitHub security advisories](https://github.com/lukebrandonfarrell/site-editor/security/advisories) for this repository. Do not open a public issue for an unfixed vulnerability.

Include what you can:

- The affected version or commit
- The environment (`VERCEL_ENV`, whether the editor was open without login)
- Steps to reproduce
- The impact you expect (for example, editing a production site without an allowlisted email)

We will acknowledge the report, work on a fix, and credit you if you want to be named.

## What this editor trusts

Preview deployments and local development can edit without a login. That is intentional. Production editing requires a magic link to an address in `SITE_EDITOR_ALLOWED_EMAILS`. Do not put secrets, tokens, or private customer data in editable copy.

Sign-in links are single-use and short-lived. Session cookies are httpOnly. Mutations require a same-origin request and the `x-site-editor` header.
