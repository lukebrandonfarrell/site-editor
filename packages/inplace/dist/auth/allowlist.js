const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function normalizeEmail(email) {
    const value = email.trim().toLowerCase();
    if (value.length > 320 || !EMAIL.test(value))
        return null;
    return value;
}
export function parseAllowlist(raw) {
    if (!raw)
        return new Set();
    const emails = raw
        .split(/[,;\s]+/)
        .map((item) => normalizeEmail(item))
        .filter((item) => Boolean(item));
    return new Set(emails);
}
export function isEmailAllowed(email, allowlist) {
    return allowlist.has(email);
}
