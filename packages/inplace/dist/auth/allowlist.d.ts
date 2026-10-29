export declare function normalizeEmail(email: string): string | null;
export declare function parseAllowlist(raw: string | undefined): Set<string>;
export declare function isEmailAllowed(email: string, allowlist: Set<string>): boolean;
