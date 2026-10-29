import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { SchemaOutdatedError, isDbUnavailable } from "../src/errors.js";
import { readPublishedOrSnapshot } from "../src/content/service.js";
import { MemorySnapshotStore } from "../src/snapshot.js";
import {
  ADVISORY_LOCK_KEY,
  applyPendingMigrations,
  autoMigrateEnabled,
  ensureSchemaState,
  loadMigrationFiles,
  migrateWarning,
  pendingMigrationNames,
  readSchemaVersion,
  type SqlClient,
} from "../src/schema/migrate.js";

test("a schema mismatch during render falls back to the snapshot", async () => {
  const columnMissing = Object.assign(new Error('column "updated_by" does not exist'), { code: "42703" });
  assert.equal(isDbUnavailable(columnMissing), false);
  const snapshots = new MemorySnapshotStore();
  await snapshots.write({
    format: 1,
    siteId: "demo",
    version: 2,
    publishedAt: "2026-10-29T12:00:00.000Z",
    content: { "hero.title": { type: "text", value: "From snapshot" } },
  });
  const store = {
    async listSpots(): Promise<never> {
      throw columnMissing;
    },
  };
  const result = await readPublishedOrSnapshot(store, snapshots, "demo");
  assert.equal(result.source, "snapshot");
  assert.equal(result.content["hero.title"]?.value, "From snapshot");
});

test("a schema mismatch with no snapshot falls back to seed text", async () => {
  const store = {
    async listSpots(): Promise<never> {
      throw Object.assign(new Error("column updated_by does not exist"), { code: "42703" });
    },
  };
  const result = await readPublishedOrSnapshot(store, new MemorySnapshotStore(), "demo");
  assert.equal(result.source, "seed");
  assert.deepEqual(result.content, {});
});

test("pending migrations are the files newer than the schema version", () => {
  const files = loadMigrationFiles();
  const names = files.map((file) => file.name);
  assert.ok(names.some((name) => name.startsWith("001")));
  assert.ok(names.some((name) => name.startsWith("002")));
  const pending = pendingMigrationNames(names, 1);
  assert.deepEqual(pending, ["002_actor.sql"]);
  assert.deepEqual(pendingMigrationNames(names, 2), []);
  const directory = join(import.meta.dirname, "../migrations");
  const onDisk = readdirSync(directory)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  assert.deepEqual(names, onDisk);
  for (const name of onDisk) {
    const bundled = files.find((file) => file.name === name);
    assert.equal(bundled?.sql, readFileSync(join(directory, name), "utf8"));
  }
});

test("auto-migrate applies only pending SQL under an advisory lock", async () => {
  const queries: Array<{ text: string; values?: unknown[] }> = [];
  const client: SqlClient = {
    async query(text, values) {
      queries.push({ text, values });
      if (text.includes("FROM site_editor_schema")) return { rows: [{ version: 1 }] };
      return { rows: [] };
    },
  };
  const files = loadMigrationFiles();
  const result = await applyPendingMigrations(client, files);
  assert.deepEqual(result.applied, ["002_actor.sql"]);
  assert.ok(
    queries.some(
      (query) => query.text.includes("pg_advisory_xact_lock") && query.values?.[0] === ADVISORY_LOCK_KEY,
    ),
  );
  assert.ok(queries.some((query) => query.text.includes("ADD COLUMN IF NOT EXISTS updated_by")));
  assert.equal(
    queries.some((query) => query.text.includes("CREATE TABLE IF NOT EXISTS site_editor_sites")),
    false,
  );
  assert.equal(queries.at(-1)?.text, "COMMIT");
});

test("a missing schema table is version 0 and does not abort the later migration", async () => {
  const missing = Object.assign(new Error('relation "site_editor_schema" does not exist'), { code: "42P01" });
  assert.equal(
    await readSchemaVersion({
      async query() {
        throw missing;
      },
    }),
    0,
  );
  const queries: string[] = [];
  let versionReads = 0;
  const client: SqlClient = {
    async query(text) {
      queries.push(text);
      if (text.includes("FROM site_editor_schema")) {
        versionReads += 1;
        if (versionReads === 1) throw missing;
        return { rows: [{ version: 2 }] };
      }
      return { rows: [] };
    },
  };
  const result = await applyPendingMigrations(client, loadMigrationFiles());
  assert.equal(result.version, 2);
  assert.ok(queries.some((sql) => sql.includes("ROLLBACK TO SAVEPOINT")));
  assert.ok(queries.some((sql) => sql.includes("CREATE TABLE IF NOT EXISTS site_editor_sites")));
  assert.ok(queries.some((sql) => sql.includes("ADD COLUMN IF NOT EXISTS updated_by")));
});

test("auto-migrate can be turned off and tells you to run the CLI", async () => {
  assert.equal(autoMigrateEnabled({ SITE_EDITOR_AUTO_MIGRATE: "0" }), false);
  assert.equal(autoMigrateEnabled({}), true);
  assert.match(migrateWarning(1, 2), /Run npx site-editor migrate/);
  let applied = false;
  const warnings: string[] = [];
  const original = console.warn;
  console.warn = (message?: unknown) => {
    warnings.push(String(message));
  };
  try {
    await assert.rejects(
      () =>
        ensureSchemaState({
          current: 1,
          expected: 2,
          env: { SITE_EDITOR_AUTO_MIGRATE: "0" },
          apply: async () => {
            applied = true;
            return { applied: [], version: 1 };
          },
        }),
      (error: unknown) => error instanceof SchemaOutdatedError && /npx site-editor migrate/.test(error.message),
    );
  } finally {
    console.warn = original;
  }
  assert.equal(applied, false);
  assert.match(warnings.join("\n"), /SITE_EDITOR_AUTO_MIGRATE=0/);
  assert.match(warnings.join("\n"), /npx site-editor migrate/);
});
