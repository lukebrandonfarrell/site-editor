import { HttpError } from "../errors.js";
function hostFrom(value) {
    if (!value)
        return null;
    try {
        if (value.includes("://"))
            return new URL(value).host.toLowerCase();
        return value.trim().toLowerCase();
    }
    catch {
        return null;
    }
}
export function isLocalHost(host) {
    const name = host.replace(/^\[|\]$/g, "").split(":")[0]?.toLowerCase() ?? "";
    return name === "localhost" || name === "127.0.0.1" || name === "::1";
}
function trustedHosts(env) {
    const hosts = new Set();
    for (const value of [
        env.SITE_EDITOR_URL,
        env.VERCEL_URL,
        env.VERCEL_PROJECT_PRODUCTION_URL,
        env.VERCEL_BRANCH_URL,
    ]) {
        const host = hostFrom(value);
        if (host)
            hosts.add(host);
    }
    return hosts;
}
/**
 * Public origin for magic links. On Vercel the platform sets the host, so the
 * incoming host is trusted. Elsewhere we only trust localhost and hosts named
 * in SITE_EDITOR_URL / Vercel env vars, which blocks host-header poisoning.
 */
export function requestOrigin(req, env = process.env) {
    const url = new URL(req.url);
    const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim().toLowerCase();
    const host = forwardedHost || req.headers.get("host")?.toLowerCase() || url.host.toLowerCase();
    const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
        url.protocol.replace(":", "") ||
        "https";
    if (env.VERCEL === "1" && host)
        return `${proto}://${host}`;
    if (isLocalHost(host))
        return `${proto}://${host}`;
    if (trustedHosts(env).has(host))
        return `${proto}://${host}`;
    const configured = env.SITE_EDITOR_URL?.trim();
    if (configured)
        return configured.replace(/\/$/, "");
    throw new HttpError(500, "site_url_unconfigured", "Set SITE_EDITOR_URL to the public site origin so sign-in links are safe to send.");
}
export function isSecureOrigin(origin) {
    return origin.startsWith("https://");
}
