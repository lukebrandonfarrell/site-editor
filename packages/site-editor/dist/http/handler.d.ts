import type { EmailSender } from "../auth/email.js";
import type { SiteEditorConfig } from "../config.js";
import type { SnapshotStore } from "../snapshot.js";
import type { AuthStore, ContentStore, RateLimitStore } from "../store/types.js";
export type SiteEditorHandlerDeps = {
    content: ContentStore;
    auth: AuthStore;
    rateLimit: RateLimitStore;
    snapshots: SnapshotStore;
    email: EmailSender;
    config: SiteEditorConfig;
    revalidate?: () => Promise<void> | void;
    now?: () => Date;
};
export declare function createSiteEditorHandler(deps: SiteEditorHandlerDeps): (req: Request) => Promise<Response>;
/** JSON the editor client can read without treating the page as a crash. */
export declare function editorUnavailableResponse(error: unknown): Response;
