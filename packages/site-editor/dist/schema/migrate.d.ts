/** Stable lock so two servers cannot apply migrations at the same time. */
export declare const ADVISORY_LOCK_KEY = 814234201;
export type SqlClient = {
    query: (text: string, values?: unknown[]) => Promise<{
        rows: Array<Record<string, unknown>>;
    }>;
};
export type MigrationFile = {
    name: string;
    sql: string;
};
export declare function migrationVersion(filename: string): number | null;
export declare function pendingMigrationNames(filenames: string[], currentVersion: number): string[];
export declare function latestMigrationVersion(filenames: string[]): number;
export declare function migrateWarning(current: number, expected: number): string;
export declare function autoMigrateEnabled(env?: NodeJS.ProcessEnv): boolean;
/** SQL shipped inside the package so a deploy does not have to read the repo. */
export declare function loadMigrationFiles(): MigrationFile[];
/** Autocommit read. A missing schema table means version 0. */
export declare function readSchemaVersion(client: SqlClient): Promise<number>;
export declare function applyPendingMigrations(client: SqlClient, files: MigrationFile[]): Promise<{
    applied: string[];
    version: number;
}>;
export declare function ensureSchemaState(input: {
    current: number;
    expected: number;
    env?: NodeJS.ProcessEnv;
    apply: () => Promise<{
        applied: string[];
        version: number;
    }>;
}): Promise<void>;
export declare function ensureCurrentSchema(databaseUrl: string, env?: NodeJS.ProcessEnv): Promise<void>;
/** Test hook. The process cache must not leak between cases. */
export declare function resetSchemaReady(): void;
