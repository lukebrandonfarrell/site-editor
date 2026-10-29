export type InplaceConfig = {
    siteId: string;
    databaseUrl: string | null;
    allowedEmails: string;
    maxTextLength: number;
    maxBodyBytes: number;
    maxSpots: number;
    openEditing: boolean;
    fromEmail: string | null;
    resendApiKey: string | null;
    magicLinkTtlMs: number;
    sessionTtlMs: number;
    revalidatePaths: string[];
    loginEmailLimit: number;
    loginEmailWindowMs: number;
    loginIpLimit: number;
    loginIpWindowMs: number;
    saveLimit: number;
    saveWindowMs: number;
    publishLimit: number;
    publishWindowMs: number;
};
/** `INPLACE_*` wins. `SITE_EDITOR_*` still works and is deprecated. */
export declare function readSetting(env: NodeJS.ProcessEnv, suffix: string): string | undefined;
/**
 * Preview deployments (and local `next dev`) show the editor with no login.
 * Production requires a magic-link session. `INPLACE_OPEN=1|0` overrides both.
 * `SITE_EDITOR_OPEN` is the deprecated name for the same switch.
 */
export declare function isOpenEditing(env?: NodeJS.ProcessEnv): boolean;
export declare function readConfig(env?: NodeJS.ProcessEnv): InplaceConfig;
/** @deprecated Use InplaceConfig. */
export type SiteEditorConfig = InplaceConfig;
