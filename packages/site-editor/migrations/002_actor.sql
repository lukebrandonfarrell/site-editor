-- Remember who saved a draft and who published a version.
-- `created_by` already exists on versions; this adds the draft actor.
-- Safe to run more than once.

ALTER TABLE site_editor_spots
  ADD COLUMN IF NOT EXISTS updated_by TEXT;

INSERT INTO site_editor_schema (version)
VALUES (2)
ON CONFLICT (version) DO NOTHING;
