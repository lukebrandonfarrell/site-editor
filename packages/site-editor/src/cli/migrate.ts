#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { applyPendingMigrations, loadMigrationFiles, readSchemaVersion } from "../schema/migrate.js";

const command = process.argv[2] ?? "migrate";
if (command !== "migrate") {
  console.error("Usage: site-editor migrate");
  process.exit(1);
}

function loadEnvFile(file: string): void {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

const here = dirname(fileURLToPath(import.meta.url));
for (const file of [
  join(process.cwd(), ".env"),
  join(process.cwd(), "apps/demo/.env"),
  join(here, "../../../apps/demo/.env"),
  join(here, "../../.env"),
]) {
  loadEnvFile(file);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required. Example: postgres://postgres:postgres@localhost:5432/site_editor");
  process.exit(1);
}

const local = /@(localhost|127\.0\.0\.1)(:|\/)/.test(databaseUrl);
const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: local ? undefined : { rejectUnauthorized: false },
});

try {
  await client.connect();
  const result = await applyPendingMigrations(client, loadMigrationFiles());
  if (result.applied.length === 0) {
    const version = await readSchemaVersion(client);
    console.log(`Schema is current (version ${version}).`);
  } else {
    for (const file of result.applied) console.log(`Applied ${file}`);
    console.log(`Site Editor migration applied (version ${result.version}).`);
  }
  const tables = await client.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'site_editor_%' ORDER BY tablename`,
  );
  for (const row of tables.rows) console.log(`  ${row.tablename}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end();
}
