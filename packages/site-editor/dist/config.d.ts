export type SiteEditorConfig = {
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
/**
 * Preview deployments (and local `next dev`) show the editor with no login.
 * Production requires a magic-link session. `SITE_EDITOR_OPEN=1|0` overrides both.
 */
export declare function isOpenEditing(env?: NodeJS.ProcessEnv): boolean;
export declare function readConfig(env?: NodeJS.ProcessEnv): SiteEditorConfig;
