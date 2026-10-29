import { assertSiteId } from "./validate.js";
function integer(raw, fallback) {
    if (!raw)
        return fallback;
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0)
        return fallback;
    return Math.floor(value);
}
/** `INPLACE_*` wins. `SITE_EDITOR_*` still works and is deprecated. */
export function readSetting(env, suffix) {
    const current = env[`INPLACE_${suffix}`];
    if (current !== undefined && current !== "")
        return current;
    const legacy = env[`SITE_EDITOR_${suffix}`];
    if (legacy !== undefined && legacy !== "")
        return legacy;
    return undefined;
}
/**
 * Preview deployments (and local `next dev`) show the editor with no login.
 * Production requires a magic-link session. `INPLACE_OPEN=1|0` overrides both.
 * `SITE_EDITOR_OPEN` is the deprecated name for the same switch.
 */
export function isOpenEditing(env = process.env) {
    const open = readSetting(env, "OPEN");
    if (open === "1")
        return true;
    if (open === "0")
        return false;
    if (env.VERCEL_ENV === "preview")
        return true;
    if (env.VERCEL_ENV === "production")
        return false;
    return env.NODE_ENV !== "production";
}
export function readConfig(env = process.env) {
    const siteId = readSetting(env, "SITE_ID")?.trim() || "default";
    assertSiteId(siteId);
    const paths = (readSetting(env, "REVALIDATE_PATHS") || "/")
        .split(",")
        .map((path) => path.trim())
        .filter(Boolean);
    return {
        siteId,
        databaseUrl: env.DATABASE_URL?.trim() || null,
        allowedEmails: readSetting(env, "ALLOWED_EMAILS") || "",
        maxTextLength: integer(readSetting(env, "MAX_TEXT_LENGTH"), 8000),
        maxBodyBytes: integer(readSetting(env, "MAX_BODY_BYTES"), 32_768),
        maxSpots: integer(readSetting(env, "MAX_SPOTS"), 200),
        openEditing: isOpenEditing(env),
        fromEmail: readSetting(env, "FROM_EMAIL")?.trim() || null,
        resendApiKey: env.RESEND_API_KEY?.trim() || null,
        magicLinkTtlMs: integer(readSetting(env, "MAGIC_LINK_TTL_MS"), 15 * 60 * 1000),
        sessionTtlMs: integer(readSetting(env, "SESSION_TTL_MS"), 7 * 24 * 60 * 60 * 1000),
        revalidatePaths: paths.length > 0 ? paths : ["/"],
        loginEmailLimit: integer(readSetting(env, "LOGIN_EMAIL_LIMIT"), 5),
        loginEmailWindowMs: integer(readSetting(env, "LOGIN_EMAIL_WINDOW_MS"), 15 * 60 * 1000),
        loginIpLimit: integer(readSetting(env, "LOGIN_IP_LIMIT"), 30),
        loginIpWindowMs: integer(readSetting(env, "LOGIN_IP_WINDOW_MS"), 15 * 60 * 1000),
        saveLimit: integer(readSetting(env, "SAVE_LIMIT"), 60),
        saveWindowMs: integer(readSetting(env, "SAVE_WINDOW_MS"), 60 * 1000),
        publishLimit: integer(readSetting(env, "PUBLISH_LIMIT"), 10),
        publishWindowMs: integer(readSetting(env, "PUBLISH_WINDOW_MS"), 5 * 60 * 1000),
    };
}
