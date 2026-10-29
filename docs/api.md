# Version API

The toolbar only publishes. Version history, restore, and undo stay on the server so an agent or a script can put an older published copy back without a button in the page.

Every mutating request must be same-origin and send `x-site-editor: 1`. On a preview deployment the editor is open without a cookie. On production, send the `site_editor_session` cookie from a magic-link sign-in. The base path is `/api/site-editor`.

## List published versions

`GET /api/site-editor/versions`

Returns the newest versions first, up to 50.

```json
{
  "versions": [
    {
      "version": 4,
      "createdAt": "2026-10-29T12:00:00.000Z",
      "actor": "client@example.com",
      "restoredFrom": null
    }
  ]
}
```

`actor` is `preview` when the publish happened without a login, or the allowlisted email when it did not. `restoredFrom` is the version number a restore was copied from, or `null`.

## Restore a version

`POST /api/site-editor/versions/restore`

```json
{ "version": 2 }
```

This writes a new version whose content is a copy of version 2. It does not delete later versions. The response is `{ "ok": true, "version": 5, "restoredFrom": 2 }`. The same rate limit as publish applies.

## Undo the latest publish

`POST /api/site-editor/versions/undo`

Body `{}`. This restores the version before the latest one, again by writing a new version. If there is no earlier version, the response is HTTP 400 `{ "error": "no_version_to_undo" }`.

## When the schema is behind

If the database has not caught up with the package, these routes return HTTP 503 `{ "enabled": false, "error": "schema_outdated" }` until migrations have run. The first request applies pending migrations unless `SITE_EDITOR_AUTO_MIGRATE=0`. You can also run `npx site-editor migrate`.
