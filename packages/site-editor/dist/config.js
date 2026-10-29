import { assertSiteId } from "./validate.js";
function integer(raw, fallback) {
    if (!raw)
        return fallback;
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0)
        return fallback;
    return Math.floor(value);
}
/**
 * Preview deployments (and local `next dev`) show the editor with no login.
 * Production requires a magic-link session. `SITE_EDITOR_OPEN=1|0` overrides both.
 */
export function isOpenEditing(env = process.env) {
    if (env.SITE_EDITOR_OPEN === "1")
        return true;
    if (env.SITE_EDITOR_OPEN === "0")
        return false;
    if (env.VERCEL_ENV === "preview")
        return true;
    if (env.VERCEL_ENV === "production")
        return false;
    return env.NODE_ENV !== "production";
}
export function readConfig(env = process.env) {
    const siteId = env.SITE_EDITOR_SITE_ID?.trim() || "default";
    assertSiteId(siteId);
    const paths = (env.SITE_EDITOR_REVALIDATE_PATHS || "/")
        .split(",")
        .map((path) => path.trim())
        .filter(Boolean);
    return {
        siteId,
        databaseUrl: env.DATABASE_URL?.trim() || null,
        allowedEmails: env.SITE_EDITOR_ALLOWED_EMAILS || "",
        maxTextLength: integer(env.SITE_EDITOR_MAX_TEXT_LENGTH, 8000),
        maxBodyBytes: integer(env.SITE_EDITOR_MAX_BODY_BYTES, 32_768),
        maxSpots: integer(env.SITE_EDITOR_MAX_SPOTS, 200),
        openEditing: isOpenEditing(env),
        fromEmail: env.SITE_EDITOR_FROM_EMAIL?.trim() || null,
        resendApiKey: env.RESEND_API_KEY?.trim() || null,
        magicLinkTtlMs: integer(env.SITE_EDITOR_MAGIC_LINK_TTL_MS, 15 * 60 * 1000),
        sessionTtlMs: integer(env.SITE_EDITOR_SESSION_TTL_MS, 7 * 24 * 60 * 60 * 1000),
        revalidatePaths: paths.length > 0 ? paths : ["/"],
        loginEmailLimit: integer(env.SITE_EDITOR_LOGIN_EMAIL_LIMIT, 5),
        loginEmailWindowMs: integer(env.SITE_EDITOR_LOGIN_EMAIL_WINDOW_MS, 15 * 60 * 1000),
        loginIpLimit: integer(env.SITE_EDITOR_LOGIN_IP_LIMIT, 30),
        loginIpWindowMs: integer(env.SITE_EDITOR_LOGIN_IP_WINDOW_MS, 15 * 60 * 1000),
        saveLimit: integer(env.SITE_EDITOR_SAVE_LIMIT, 60),
        saveWindowMs: integer(env.SITE_EDITOR_SAVE_WINDOW_MS, 60 * 1000),
        publishLimit: integer(env.SITE_EDITOR_PUBLISH_LIMIT, 10),
        publishWindowMs: integer(env.SITE_EDITOR_PUBLISH_WINDOW_MS, 5 * 60 * 1000),
    };
}
