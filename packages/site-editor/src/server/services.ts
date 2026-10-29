import "server-only";
import { createEmailSender } from "../auth/email.js";
import { readConfig, type SiteEditorConfig } from "../config.js";
import { DatabaseUnavailableError } from "../errors.js";
import { createSnapshotStore, type SnapshotStore } from "../snapshot.js";
import { createPostgresStores } from "../store/postgres.js";
import type { AuthStore, ContentStore, RateLimitStore } from "../store/types.js";

export type EditorServices = {
  content: ContentStore;
  auth: AuthStore;
  rateLimit: RateLimitStore;
  snapshots: SnapshotStore;
  email: ReturnType<typeof createEmailSender>;
  config: SiteEditorConfig;
};

export function createDefaultServices(env: NodeJS.ProcessEnv = process.env): EditorServices {
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
