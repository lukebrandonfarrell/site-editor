# Security

Report vulnerabilities through [GitHub security advisories](https://github.com/the-react-native-rewind/inplace/security/advisories). The repository policy is [SECURITY.md](../SECURITY.md).

## Who can edit

- **Preview and local dev.** Anyone with the URL can edit and publish. Do not put secrets in editable copy. Preview URLs are unlisted, not a lock. `VERCEL_ENV=preview` and local `next dev` / `astro dev` open the editor. `INPLACE_OPEN=1` forces that open. `INPLACE_OPEN=0` forces a login everywhere.
- **Production.** The toolbar is hidden in CSS until the session check confirms this visitor may edit. A client opens `/?inplace=login` (`/?site-editor=login` still works), enters an allowlisted email, and receives a one-time link. The link lasts 15 minutes, works once, and sets an httpOnly cookie named `inplace_session` for 7 days. An older `site_editor_session` cookie is still accepted and cleared on the next sign-in.
- **Allowlist.** `INPLACE_ALLOWED_EMAILS`. An empty list denies every login. Comparison is case-insensitive.
- **Email.** Resend when `RESEND_API_KEY` and `INPLACE_FROM_EMAIL` are both set. Otherwise the link is printed on the server. Resend’s `onboarding@resend.dev` sender only delivers to the Resend account address. Use a verified domain for clients.
- **Host pinning.** Sign-in links use the Vercel host or localhost. Any other host must match `INPLACE_URL` (or the deprecated `SITE_EDITOR_URL`), so a forged `Host` header cannot steal the link.

## Requests

Mutations must be same-origin and send `x-inplace: 1`. `x-site-editor: 1` is still accepted. The editor UI sends `x-inplace`. Copy is stored and rendered as text, not HTML.

Limits, unless you change them:

- 8,000 characters per spot (`INPLACE_MAX_TEXT_LENGTH`)
- 32 KB per request (`INPLACE_MAX_BODY_BYTES`)
- 200 spots per site (`INPLACE_MAX_SPOTS`)
- 60 draft saves per minute per IP
- 10 publish, restore, or undo actions per 5 minutes per site
- 5 magic-link requests per 15 minutes per email, and 30 per 15 minutes per IP

## Content Security Policy

The Astro component imports `@thereactnativerewind/inplace/styles.css`, which Vite emits as a stylesheet URL, and it does not inject a `<style>` tag. Link that file yourself if you mount the script by hand, and call `mountInplace({ injectStyles: false })` or set `<meta name="inplace-styles" content="external" />`. `<meta name="site-editor-styles" content="external" />` is still honored.

The Next.js provider injects the same CSS by default. Pass `injectStyles={false}` and import `styles.css` when you have a strict policy.

Injecting a style tag requires `style-src-elem 'unsafe-inline'` (or a hash of that file). A linked stylesheet only needs `style-src-elem 'self'`.

The toolbar stays invisible until `html[data-inplace-chrome="on"]`. That attribute is set only after the session check confirms a preview or a signed-in editor, so production HTML does not flash the bar while `/api/inplace/session` is in flight.
