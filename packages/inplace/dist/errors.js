export class ContentError extends Error {
    code;
    constructor(code, message) {
        super(message ?? code);
        this.name = "ContentError";
        this.code = code;
    }
}
export class DatabaseUnavailableError extends Error {
    code = "database_unavailable";
    constructor(message = "Database is unreachable", options) {
        super(message, options);
        this.name = "DatabaseUnavailableError";
    }
}
export class SchemaMissingError extends Error {
    code = "schema_missing";
    constructor() {
        super("Inplace tables are missing. Run npx inplace migrate.");
        this.name = "SchemaMissingError";
    }
}
export class SchemaOutdatedError extends Error {
    code = "schema_outdated";
    constructor(message = "Inplace schema is out of date. Run npx inplace migrate.") {
        super(message);
        this.name = "SchemaOutdatedError";
    }
}
export class HttpError extends Error {
    status;
    code;
    constructor(status, code, message) {
        super(message ?? code);
        this.name = "HttpError";
        this.status = status;
        this.code = code;
    }
}
const CONNECTION_CODES = new Set([
    "ECONNREFUSED",
    "ECONNRESET",
    "ETIMEDOUT",
    "ENOTFOUND",
    "EAI_AGAIN",
    "EHOSTUNREACH",
    "ENETUNREACH",
    "57P01",
    "57P02",
    "57P03",
    "08000",
    "08001",
    "08003",
    "08004",
    "08006",
    "53300",
]);
export function isDbUnavailable(error) {
    if (error instanceof DatabaseUnavailableError)
        return true;
    if (error instanceof AggregateError)
        return error.errors.some((item) => isDbUnavailable(item));
    if (!error || typeof error !== "object")
        return false;
    const code = "code" in error && typeof error.code === "string" ? error.code : "";
    if (CONNECTION_CODES.has(code))
        return true;
    const cause = "cause" in error ? error.cause : undefined;
    if (cause && cause !== error && isDbUnavailable(cause))
        return true;
    const message = "message" in error && typeof error.message === "string" ? error.message.toLowerCase() : "";
    return (message.includes("econnrefused") ||
        message.includes("connection terminated") ||
        message.includes("timeout exceeded when trying to connect") ||
        message.includes("the database system is starting up") ||
        message.includes("the database system is shutting down") ||
        message.includes("could not connect") ||
        message.includes("connection refused"));
}
