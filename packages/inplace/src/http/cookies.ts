export const SESSION_COOKIE = "inplace_session";
export const LEGACY_SESSION_COOKIE = "site_editor_session";

export function serializeSessionCookie(token: string, maxAgeSec: number, secure: boolean): string {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${maxAgeSec}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie(secure: boolean): string {
  return serializeSessionCookie("", 0, secure);
}

export function clearNamedCookie(name: string, secure: boolean): string {
  const parts = [`${name}=`, "HttpOnly", "Path=/", "SameSite=Lax", "Max-Age=0"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function readSessionCookie(header: string | null): string | null {
  return readCookie(header, SESSION_COOKIE) ?? readCookie(header, LEGACY_SESSION_COOKIE);
}

export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}
