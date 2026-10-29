import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { publishSite, readPublishedOrSnapshot, restoreSite, saveDraft, seedSpot } from "../src/content/service.js";
import { isDbUnavailable } from "../src/errors.js";
import { MemorySnapshotStore } from "../src/snapshot.js";
import { PostgresContentStore } from "../src/store/postgres.js";

const databaseUrl = process.env.DATABASE_URL;

test(
  "postgres stores drafts, versions, and snapshot fallback",
  { skip: databaseUrl ? false : "DATABASE_URL is not set" },
  async () => {
    const pool = new pg.Pool({
      connectionString: databaseUrl,
      connectionTimeoutMillis: 2000,
    });
    const siteId = `test_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "../migrations");
    const store = new PostgresContentStore(pool);
    const snapshots = new MemorySnapshotStore();
    try {
      for (const file of readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort()) {
        await pool.query(readFileSync(join(migrationsDir, file), "utf8"));
      }
      const seeded = await seedSpot(store, siteId, "hero.title", "Initial text", {
        maxTextLength: 200,
        maxSpots: 20,
      });
      const ignored = await seedSpot(store, siteId, "hero.title", "Code changed", {
        maxTextLength: 200,
        maxSpots: 20,
      });
      assert.equal(seeded.value, "Initial text");
      assert.equal(ignored.value, "Initial text");

      await saveDraft(store, siteId, "hero.title", { type: "text", value: "Published copy" }, "client@example.com");
      assert.equal((await store.getSpot(siteId, "hero.title"))?.updatedBy, "client@example.com");
      const before = await readPublishedOrSnapshot(store, snapshots, siteId);
      assert.equal(before.content["hero.title"]?.value, "Initial text");

      const published = await publishSite(store, snapshots, siteId, "client@example.com");
      assert.equal(published.version, 1);
      assert.equal((await store.listVersions(siteId, 1))[0]?.actor, "client@example.com");
      assert.equal(snapshots.value?.content["hero.title"]?.value, "Published copy");

      await saveDraft(store, siteId, "hero.title", { type: "text", value: "Second" }, "client@example.com");
      await publishSite(store, snapshots, siteId, "client@example.com");
      const restored = await restoreSite(store, snapshots, siteId, 1, "client@example.com");
      assert.equal(restored.version, 3);
      const after = await readPublishedOrSnapshot(store, snapshots, siteId);
      assert.equal(after.content["hero.title"]?.value, "Published copy");

      const deadPool = new pg.Pool({
        connectionString: "postgres://postgres:postgres@127.0.0.1:1/inplace",
        connectionTimeoutMillis: 500,
      });
      try {
        await assert.rejects(
          () => new PostgresContentStore(deadPool).listSpots(siteId),
          (error: unknown) => isDbUnavailable(error),
        );
      } finally {
        await deadPool.end();
      }

      const fallback = await readPublishedOrSnapshot(
        {
          async listSpots() {
            throw Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:5432"), {
              code: "ECONNREFUSED",
            });
          },
        },
        snapshots,
        siteId,
      );
      assert.equal(fallback.source, "snapshot");
      assert.equal(fallback.content["hero.title"]?.value, "Published copy");
    } finally {
      await pool.query(`DELETE FROM inplace_sites WHERE site_id = $1`, [siteId]);
      await pool.end();
    }
  },
);
