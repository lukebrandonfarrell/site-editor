const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string | null {
  const value = email.trim().toLowerCase();
  if (value.length > 320 || !EMAIL.test(value)) return null;
  return value;
}

export function parseAllowlist(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  const emails = raw
    .split(/[,;\s]+/)
    .map((item) => normalizeEmail(item))
    .filter((item): item is string => Boolean(item));
  return new Set(emails);
}

export function isEmailAllowed(email: string, allowlist: Set<string>): boolean {
  return allowlist.has(email);
}
