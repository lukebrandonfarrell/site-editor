# Compatibility and CSP

## Next.js

Peer dependency `next` 15 or newer, and `react` / `react-dom` 18 or newer. The demo runs on Next.js 16. The route handler is Node.js (`export const runtime = "nodejs"`), not the edge runtime. Import it from `@thereactnativerewind/inplace/next`.

## Astro

Peer dependency `astro` 5 or newer and `@astrojs/vercel` 8 or later. Those two still have to match each other:

| Astro | `@astrojs/vercel` |
| --- | --- |
| 5.x | 9.x (`^9` with `"astro": "^5"`) |
| 7 | 11 |

Adapter 11 does not install on Astro 5. The demo in `apps/demo-astro` is pinned to Astro 5.18.2 and `@astrojs/vercel` 9.0.5, and CI builds that pair.

Pages that contain `<Editable>` must be server-rendered. `output: 'server'`, or `export const prerender = false` on the page and on the API route.

## Node

Node.js 20 or newer. The package is ESM.

## Git install

```json
"@thereactnativerewind/inplace": "github:the-react-native-rewind/inplace#main&path:packages/inplace"
```

pnpm and Yarn honor `path:`. npm does not. `dist` is committed because pnpm 10 blocks dependency build scripts unless you allowlist them.

## Images on protected previews

Astro server output serves optimized images from `/_image`. Vercel Deployment Protection (SSO) does not forward the protection cookie to that route, so those images can break on a preview URL. Point `<img>` at a file in `public/`, emit the image without the image service, or add a [Deployment Protection bypass](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection) for `/_image`.

## Content Security Policy

See [security.md](security.md). A linked `@thereactnativerewind/inplace/styles.css` needs `style-src-elem 'self'`. The Next.js provider’s inline `<style>` needs `style-src-elem 'unsafe-inline'` or a hash. Pass `injectStyles={false}` and import the stylesheet when the policy is strict. Astro already links the file and does not inject a tag.

`mountInplace({ injectStyles: false })` is the Astro script option. `mountSiteEditor` is the deprecated name of the same function.
