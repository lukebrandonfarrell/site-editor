import type { MigrationFile } from "./migrate.js";
/**
 * Copies of `migrations/*.sql`. Kept here so Next.js can bundle them without
 * tracing the repository. `test/schema.test.ts` checks they still match the files.
 */
export declare const bundledMigrations: MigrationFile[];
