import type { EmailSender } from "../auth/email.js";
import type { InplaceConfig } from "../config.js";
import type { SnapshotStore } from "../snapshot.js";
import type { AuthStore, ContentStore, RateLimitStore } from "../store/types.js";
export type InplaceHandlerDeps = {
    content: ContentStore;
    auth: AuthStore;
    rateLimit: RateLimitStore;
    snapshots: SnapshotStore;
    email: EmailSender;
    config: InplaceConfig;
    revalidate?: () => Promise<void> | void;
    now?: () => Date;
};
export declare function createInplaceHandler(deps: InplaceHandlerDeps): (req: Request) => Promise<Response>;
/** JSON the editor client can read without treating the page as a crash. */
export declare function editorUnavailableResponse(error: unknown): Response;
/** @deprecated Use createInplaceHandler. */
export declare const createSiteEditorHandler: typeof createInplaceHandler;
/** @deprecated Use InplaceHandlerDeps. */
export type SiteEditorHandlerDeps = InplaceHandlerDeps;
