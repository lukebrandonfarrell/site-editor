export declare class ContentError extends Error {
    readonly code: string;
    constructor(code: string, message?: string);
}
export declare class DatabaseUnavailableError extends Error {
    readonly code = "database_unavailable";
    constructor(message?: string, options?: {
        cause?: unknown;
    });
}
export declare class SchemaMissingError extends Error {
    readonly code = "schema_missing";
    constructor();
}
export declare class SchemaOutdatedError extends Error {
    readonly code = "schema_outdated";
    constructor(message?: string);
}
export declare class HttpError extends Error {
    readonly status: number;
    readonly code: string;
    constructor(status: number, code: string, message?: string);
}
export declare function isDbUnavailable(error: unknown): boolean;
