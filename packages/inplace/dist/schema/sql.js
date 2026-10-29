/**
 * Copies of `migrations/*.sql`. Kept here so Next.js can bundle them without
 * tracing the repository. `test/schema.test.ts` checks they still match the files.
 */
export const bundledMigrations = [
    {
        name: "001_init.sql",
        sql: `-- Site Editor v1 schema. Safe to run more than once.
-- Content JSON is typed ({ "type": "text", "value": "..." }) so image and
-- spacing values can be stored later without a table change.

CREATE TABLE IF NOT EXISTS site_editor_sites (
  site_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_editor_spots (
  site_id TEXT NOT NULL REFERENCES site_editor_sites (site_id) ON DELETE CASCADE,
  spot_id TEXT NOT NULL,
  draft JSONB NOT NULL,
  published JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (site_id, spot_id)
);

CREATE TABLE IF NOT EXISTS site_editor_versions (
  site_id TEXT NOT NULL REFERENCES site_editor_sites (site_id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content JSONB NOT NULL,
  created_by TEXT,
  restored_from INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (site_id, version)
);

CREATE INDEX IF NOT EXISTS site_editor_versions_site_idx
  ON site_editor_versions (site_id, version DESC);

CREATE TABLE IF NOT EXISTS site_editor_magic_links (
  token_hash TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS site_editor_magic_links_email_idx
  ON site_editor_magic_links (site_id, email, created_at DESC);

CREATE TABLE IF NOT EXISTS site_editor_sessions (
  token_hash TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS site_editor_sessions_site_idx
  ON site_editor_sessions (site_id, email);

CREATE TABLE IF NOT EXISTS site_editor_rate_limits (
  bucket TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  window_start TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS site_editor_schema (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO site_editor_schema (version)
VALUES (1)
ON CONFLICT (version) DO NOTHING;
`,
    },
    {
        name: "002_actor.sql",
        sql: `-- Remember who saved a draft and who published a version.
-- \`created_by\` already exists on versions; this adds the draft actor.
-- Safe to run more than once.

ALTER TABLE site_editor_spots
  ADD COLUMN IF NOT EXISTS updated_by TEXT;

INSERT INTO site_editor_schema (version)
VALUES (2)
ON CONFLICT (version) DO NOTHING;
`,
    },
    {
        name: "003_rename.sql",
        sql: `-- Rename site_editor_* tables to inplace_* for installs created before 0.3.0.
-- 001 and 002 still create the old names so this file can move an existing
-- database without rewriting those migrations. Safe to run more than once.

DO $$
DECLARE
  suffixes text[] := ARRAY[
    'sites',
    'spots',
    'versions',
    'magic_links',
    'sessions',
    'rate_limits',
    'schema'
  ];
  suffix text;
  old_name text;
  new_name text;
  old_exists boolean;
  new_exists boolean;
  old_count bigint;
BEGIN
  FOREACH suffix IN ARRAY suffixes LOOP
    old_name := 'site_editor_' || suffix;
    new_name := 'inplace_' || suffix;
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = old_name
    ) INTO old_exists;
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = new_name
    ) INTO new_exists;
    IF old_exists AND NOT new_exists THEN
      EXECUTE format('ALTER TABLE %I RENAME TO %I', old_name, new_name);
    ELSIF old_exists AND new_exists THEN
      EXECUTE format('SELECT count(*) FROM %I', old_name) INTO old_count;
      IF old_count = 0 THEN
        EXECUTE format('DROP TABLE %I CASCADE', old_name);
      END IF;
    END IF;
  END LOOP;
END $$;

INSERT INTO inplace_schema (version)
VALUES (3)
ON CONFLICT (version) DO NOTHING;
`,
    },
];
