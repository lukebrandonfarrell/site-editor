export declare const SESSION_COOKIE = "site_editor_session";
export declare function serializeSessionCookie(token: string, maxAgeSec: number, secure: boolean): string;
export declare function clearSessionCookie(secure: boolean): string;
export declare function readCookie(header: string | null, name: string): string | null;
