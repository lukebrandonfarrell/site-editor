export declare function isLocalHost(host: string): boolean;
/**
 * Public origin for magic links. On Vercel the platform sets the host, so the
 * incoming host is trusted. Elsewhere we only trust localhost and hosts named
 * in SITE_EDITOR_URL / Vercel env vars, which blocks host-header poisoning.
 */
export declare function requestOrigin(req: Request, env?: NodeJS.ProcessEnv): string;
export declare function isSecureOrigin(origin: string): boolean;
