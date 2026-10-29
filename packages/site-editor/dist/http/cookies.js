export const SESSION_COOKIE = "site_editor_session";
export function serializeSessionCookie(token, maxAgeSec, secure) {
    const parts = [
        `${SESSION_COOKIE}=${token}`,
        "HttpOnly",
        "Path=/",
        "SameSite=Lax",
        `Max-Age=${maxAgeSec}`,
    ];
    if (secure)
        parts.push("Secure");
    return parts.join("; ");
}
export function clearSessionCookie(secure) {
    return serializeSessionCookie("", 0, secure);
}
export function readCookie(header, name) {
    if (!header)
        return null;
    for (const part of header.split(";")) {
        const [key, ...rest] = part.trim().split("=");
        if (key === name)
            return decodeURIComponent(rest.join("="));
    }
    return null;
}
