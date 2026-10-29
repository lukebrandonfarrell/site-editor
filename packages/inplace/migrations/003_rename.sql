-- Rename site_editor_* tables to inplace_* for installs created before 0.3.0.
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
