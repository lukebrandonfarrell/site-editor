import { createEmailSender } from "../auth/email.js";
import { readConfig } from "../config.js";
import { DatabaseUnavailableError } from "../errors.js";
import { createSnapshotStore } from "../snapshot.js";
import { createPostgresStores } from "../store/postgres.js";
/** Postgres-backed services. Used by the Next.js and Astro adapters. */
export function createDefaultServices(env = process.env) {
    const config = readConfig(env);
    if (!config.databaseUrl) {
        throw new DatabaseUnavailableError("DATABASE_URL is not set");
    }
    const stores = createPostgresStores(config.databaseUrl);
    return {
        ...stores,
        snapshots: createSnapshotStore(env),
        email: createEmailSender(config),
        config,
    };
}
