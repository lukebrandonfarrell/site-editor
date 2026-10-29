# @thereactnativerewind/inplace

Plug-in visual editor for Next.js and Astro, from The React Native Rewind. Mark the copy clients can change, and they edit it on the live site or a Vercel preview. Publish updates the site within a few seconds — no pull request and no rebuild.

The repository README is for people adding Inplace to an agent. Developer notes:

- [Next.js](https://github.com/the-react-native-rewind/inplace/blob/main/docs/nextjs.md)
- [Astro](https://github.com/the-react-native-rewind/inplace/blob/main/docs/astro.md)
- [Configuration](https://github.com/the-react-native-rewind/inplace/blob/main/docs/configuration.md)

Astro: import `@thereactnativerewind/inplace/astro` for the API route and `@thereactnativerewind/inplace/astro/Editable.astro` for the component. The toolbar does not use React.

```bash
npm install @thereactnativerewind/inplace pg
DATABASE_URL=postgres://... npx inplace migrate
```
