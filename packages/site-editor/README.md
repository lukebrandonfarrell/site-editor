# @thereactnativerewind/site-editor

Plug-in visual editor for Next.js and Astro, from The React Native Rewind. Mark the copy clients can change, and they edit it on the live site or a Vercel preview. Publish updates the site within a few seconds — no pull request and no rebuild.

Full install, environment, and publishing notes live in the [repository README](https://github.com/lukebrandonfarrell/site-editor#readme).

Astro: import `@thereactnativerewind/site-editor/astro` for the API route and `@thereactnativerewind/site-editor/astro/Editable.astro` for the component. The toolbar does not use React.

```bash
npm install @thereactnativerewind/site-editor pg
DATABASE_URL=postgres://... npx site-editor migrate
```
