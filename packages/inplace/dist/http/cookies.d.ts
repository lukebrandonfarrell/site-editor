export declare const SESSION_COOKIE = "inplace_session";
export declare const LEGACY_SESSION_COOKIE = "site_editor_session";
export declare function serializeSessionCookie(token: string, maxAgeSec: number, secure: boolean): string;
export declare function clearSessionCookie(secure: boolean): string;
export declare function clearNamedCookie(name: string, secure: boolean): string;
export declare function readSessionCookie(header: string | null): string | null;
export declare function readCookie(header: string | null, name: string): string | null;
