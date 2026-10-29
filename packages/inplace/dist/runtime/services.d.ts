import { createEmailSender } from "../auth/email.js";
import { type InplaceConfig } from "../config.js";
import { type SnapshotStore } from "../snapshot.js";
import type { AuthStore, ContentStore, RateLimitStore } from "../store/types.js";
export type EditorServices = {
    content: ContentStore;
    auth: AuthStore;
    rateLimit: RateLimitStore;
    snapshots: SnapshotStore;
    email: ReturnType<typeof createEmailSender>;
    config: InplaceConfig;
};
/** Postgres-backed services. Used by the Next.js and Astro adapters. */
export declare function createDefaultServices(env?: NodeJS.ProcessEnv): EditorServices;
