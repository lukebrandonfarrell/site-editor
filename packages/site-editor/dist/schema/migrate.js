import { SchemaOutdatedError } from "../errors.js";
import { getPool } from "../store/postgres.js";
import { bundledMigrations } from "./sql.js";
/** Stable lock so two servers cannot apply migrations at the same time. */
export const ADVISORY_LOCK_KEY = 814234201;
const readyDatabases = new Set();
export function migrationVersion(filename) {
    const match = /^(\d+)/.exec(filename);
    if (!match)
        return null;
    const version = Number(match[1]);
    return Number.isInteger(version) ? version : null;
}
export function pendingMigrationNames(filenames, currentVersion) {
    return filenames
        .filter((name) => {
        const version = migrationVersion(name);
        return version !== null && version > currentVersion;
    })
        .sort();
}
export function latestMigrationVersion(filenames) {
    return filenames.reduce((max, name) => Math.max(max, migrationVersion(name) ?? 0), 0);
}
export function migrateWarning(current, expected) {
    const state = current <= 0 ? "missing" : `version ${current}`;
    return `Site Editor schema is ${state}, expected version ${expected}. Run npx site-editor migrate.`;
}
export function autoMigrateEnabled(env = process.env) {
    return env.SITE_EDITOR_AUTO_MIGRATE !== "0";
}
/** SQL shipped inside the package so a deploy does not have to read the repo. */
export function loadMigrationFiles() {
    return bundledMigrations.map((file) => ({ ...file }));
}
function undefinedTable(error) {
    return Boolean(error && typeof error === "object" && "code" in error && error.code === "42P01");
}
/** Autocommit read. A missing schema table means version 0. */
export async function readSchemaVersion(client) {
    try {
        const result = await client.query("SELECT COALESCE(MAX(version), 0)::int AS version FROM site_editor_schema");
        return Number(result.rows[0]?.version ?? 0);
    }
    catch (error) {
        if (undefinedTable(error))
            return 0;
        throw error;
    }
}
/**
 * Read the version inside an open transaction. A missing table aborts the
 * transaction in Postgres, so the probe sits on a savepoint.
 */
async function readSchemaVersionLocked(client) {
    await client.query("SAVEPOINT site_editor_schema_version");
    try {
        const result = await client.query("SELECT COALESCE(MAX(version), 0)::int AS version FROM site_editor_schema");
        await client.query("RELEASE SAVEPOINT site_editor_schema_version");
        return Number(result.rows[0]?.version ?? 0);
    }
    catch (error) {
        await client.query("ROLLBACK TO SAVEPOINT site_editor_schema_version");
        if (undefinedTable(error))
            return 0;
        throw error;
    }
}
export async function applyPendingMigrations(client, files) {
    await client.query("BEGIN");
    try {
        await client.query("SELECT pg_advisory_xact_lock($1)", [ADVISORY_LOCK_KEY]);
        const current = await readSchemaVersionLocked(client);
        const pending = pendingMigrationNames(files.map((file) => file.name), current);
        const applied = [];
        for (const name of pending) {
            const file = files.find((item) => item.name === name);
            if (!file)
                continue;
            await client.query(file.sql);
            applied.push(name);
        }
        const version = await readSchemaVersionLocked(client);
        await client.query("COMMIT");
        return { applied, version };
    }
    catch (error) {
        try {
            await client.query("ROLLBACK");
        }
        catch {
            // The original error is the one to surface.
        }
        throw error;
    }
}
export async function ensureSchemaState(input) {
    if (input.current >= input.expected)
        return;
    const env = input.env ?? process.env;
    if (!autoMigrateEnabled(env)) {
        const warning = migrateWarning(input.current, input.expected);
        console.warn(`[site-editor] ${warning} Auto-migrate is off because SITE_EDITOR_AUTO_MIGRATE=0.`);
        throw new SchemaOutdatedError(warning);
    }
    const result = await input.apply();
    if (result.applied.length > 0) {
        console.warn(`[site-editor] Applied pending migrations: ${result.applied.join(", ")}`);
    }
    if (result.version < input.expected) {
        const warning = migrateWarning(result.version, input.expected);
        console.warn(`[site-editor] ${warning}`);
        throw new SchemaOutdatedError(warning);
    }
}
export async function ensureCurrentSchema(databaseUrl, env = process.env) {
    if (readyDatabases.has(databaseUrl))
        return;
    const pool = getPool(databaseUrl);
    const files = loadMigrationFiles();
    const expected = latestMigrationVersion(files.map((file) => file.name));
    const current = await readSchemaVersion(pool);
    if (current >= expected) {
        readyDatabases.add(databaseUrl);
        return;
    }
    const client = await pool.connect();
    try {
        await ensureSchemaState({
            current,
            expected,
            env,
            apply: () => applyPendingMigrations(client, files),
        });
    }
    finally {
        client.release();
    }
    readyDatabases.add(databaseUrl);
}
/** Test hook. The process cache must not leak between cases. */
export function resetSchemaReady() {
    readyDatabases.clear();
}
