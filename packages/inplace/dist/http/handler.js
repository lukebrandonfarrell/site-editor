import { isEmailAllowed, normalizeEmail, parseAllowlist } from "../auth/allowlist.js";
import { hashToken, newToken } from "../auth/tokens.js";
import { publishSite, restoreSite, saveDraft, undoSite } from "../content/service.js";
import { ContentError, DatabaseUnavailableError, HttpError, SchemaMissingError, SchemaOutdatedError, isDbUnavailable, } from "../errors.js";
import { ensureCurrentSchema } from "../schema/migrate.js";
import { draftMap, parseTextContent, publishedMap } from "../validate.js";
import { clearNamedCookie, clearSessionCookie, LEGACY_SESSION_COOKIE, readSessionCookie, serializeSessionCookie, } from "./cookies.js";
import { isSecureOrigin, requestOrigin } from "./origin.js";
const API_MARKERS = ["/api/inplace/", "/api/site-editor/"];
function matchedMarker(req) {
    const pathname = new URL(req.url).pathname;
    return API_MARKERS.find((marker) => pathname.includes(marker)) ?? API_MARKERS[0];
}
function pathSegments(req) {
    const pathname = new URL(req.url).pathname;
    const marker = matchedMarker(req);
    const index = pathname.indexOf(marker);
    const rest = index >= 0 ? pathname.slice(index + marker.length) : pathname.replace(/^\//, "");
    return rest.split("/").filter(Boolean);
}
function json(body, status = 200, extra) {
    const headers = new Headers({
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
    });
    if (extra) {
        for (const [key, value] of Object.entries(extra))
            headers.set(key, value);
    }
    return new Response(JSON.stringify(body), { status, headers });
}
function clientIp(req) {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded)
        return forwarded.split(",")[0]?.trim() || "unknown";
    return req.headers.get("x-real-ip") || "unknown";
}
async function readBody(req, maxBytes) {
    const declared = req.headers.get("content-length");
    if (declared && Number(declared) > maxBytes) {
        throw new HttpError(413, "payload_too_large", "The request body is too large.");
    }
    const buffer = await req.arrayBuffer();
    if (buffer.byteLength > maxBytes) {
        throw new HttpError(413, "payload_too_large", "The request body is too large.");
    }
    if (buffer.byteLength === 0)
        return {};
    try {
        return JSON.parse(new TextDecoder().decode(buffer));
    }
    catch {
        throw new HttpError(400, "invalid_json", "The request body must be JSON.");
    }
}
function assertEditorHeader(req) {
    if (req.headers.get("x-inplace") !== "1" && req.headers.get("x-site-editor") !== "1") {
        throw new HttpError(403, "forbidden", "Missing editor header.");
    }
}
function assertSameOrigin(req, env) {
    const origin = req.headers.get("origin");
    if (!origin)
        return;
    if (origin !== requestOrigin(req, env)) {
        throw new HttpError(403, "bad_origin", "Cross-origin request was rejected.");
    }
}
export function createInplaceHandler(deps) {
    const now = deps.now ?? (() => new Date());
    const allowlist = parseAllowlist(deps.config.allowedEmails);
    async function requireEditor(req) {
        const session = await currentSession(req);
        if (session)
            return { actor: session.email };
        if (deps.config.openEditing)
            return { actor: "preview" };
        throw new HttpError(401, "unauthorized", "Sign in to edit this site.");
    }
    async function currentSession(req) {
        const token = readSessionCookie(req.headers.get("cookie"));
        if (!token)
            return null;
        const session = await deps.auth.getSession(hashToken(token), now());
        if (!session || session.siteId !== deps.config.siteId)
            return null;
        return session;
    }
    async function limit(bucket, limitCount, windowMs) {
        const decision = await deps.rateLimit.consume(bucket, now().getTime(), windowMs, limitCount);
        if (!decision.allowed) {
            throw new HttpError(429, "rate_limited", "Too many requests. Try again shortly.");
        }
    }
    async function revalidate() {
        if (deps.revalidate)
            await deps.revalidate();
    }
    return async function handle(req) {
        try {
            if (deps.config.databaseUrl)
                await ensureCurrentSchema(deps.config.databaseUrl);
            if (req.method !== "GET" && req.method !== "HEAD") {
                assertEditorHeader(req);
                assertSameOrigin(req, process.env);
            }
            const key = `${req.method} ${pathSegments(req).join("/")}`;
            switch (key) {
                case "GET session":
                    return await getSession(req);
                case "GET content":
                    return await getContent(req);
                case "PUT drafts":
                    return await putDraft(req);
                case "POST publish":
                    return await postPublish(req);
                case "GET versions":
                    return await getVersions(req);
                case "POST versions/restore":
                    return await postRestore(req);
                case "POST versions/undo":
                    return await postUndo(req);
                case "POST auth/request":
                    return await postAuthRequest(req);
                case "GET auth/callback":
                    return await getAuthCallback(req);
                case "POST auth/logout":
                    return await postLogout(req);
                default:
                    return json({ error: "not_found", message: "Unknown Inplace route." }, 404);
            }
        }
        catch (error) {
            return toErrorResponse(error);
        }
    };
    async function getSession(req) {
        const session = await currentSession(req);
        if (!session)
            return json({ authenticated: false, open: deps.config.openEditing });
        return json({ authenticated: true, email: session.email, open: deps.config.openEditing });
    }
    async function getContent(req) {
        const spots = await deps.content.listSpots(deps.config.siteId);
        const published = publishedMap(spots);
        let editor = null;
        try {
            editor = await requireEditor(req);
        }
        catch (error) {
            if (!(error instanceof HttpError) || error.status !== 401)
                throw error;
        }
        const body = {
            published,
            canEdit: Boolean(editor),
        };
        if (editor)
            body.drafts = draftMap(spots);
        return json(body);
    }
    async function putDraft(req) {
        const editor = await requireEditor(req);
        const ip = clientIp(req);
        await limit(`save:${deps.config.siteId}:${ip}`, deps.config.saveLimit, deps.config.saveWindowMs);
        const body = (await readBody(req, deps.config.maxBodyBytes));
        if (typeof body.id !== "string") {
            throw new HttpError(400, "invalid_content", "A spot id is required.");
        }
        const content = parseTextContent(body.content, deps.config.maxTextLength);
        await saveDraft(deps.content, deps.config.siteId, body.id, content, editor.actor);
        return json({ ok: true, id: body.id, actor: editor.actor });
    }
    async function postPublish(req) {
        const editor = await requireEditor(req);
        await limit(`publish:${deps.config.siteId}`, deps.config.publishLimit, deps.config.publishWindowMs);
        const result = await publishSite(deps.content, deps.snapshots, deps.config.siteId, editor.actor);
        await revalidate();
        return json({
            ok: true,
            version: result.version,
            publishedAt: result.createdAt,
            actor: editor.actor,
        });
    }
    async function getVersions(req) {
        await requireEditor(req);
        const versions = await deps.content.listVersions(deps.config.siteId, 50);
        return json({ versions });
    }
    async function postRestore(req) {
        const editor = await requireEditor(req);
        await limit(`publish:${deps.config.siteId}`, deps.config.publishLimit, deps.config.publishWindowMs);
        const body = (await readBody(req, deps.config.maxBodyBytes));
        if (typeof body.version !== "number") {
            throw new HttpError(400, "invalid_content", "A version number is required.");
        }
        const result = await restoreSite(deps.content, deps.snapshots, deps.config.siteId, body.version, editor.actor);
        await revalidate();
        return json({ ok: true, version: result.version, restoredFrom: body.version });
    }
    async function postUndo(req) {
        const editor = await requireEditor(req);
        await limit(`publish:${deps.config.siteId}`, deps.config.publishLimit, deps.config.publishWindowMs);
        const result = await undoSite(deps.content, deps.snapshots, deps.config.siteId, editor.actor);
        await revalidate();
        return json({ ok: true, version: result.version });
    }
    async function postAuthRequest(req) {
        const ip = clientIp(req);
        const body = (await readBody(req, 4_096));
        if (typeof body.email !== "string") {
            throw new HttpError(400, "invalid_email", "Enter an email address.");
        }
        const email = normalizeEmail(body.email);
        if (!email)
            throw new HttpError(400, "invalid_email", "Enter a valid email address.");
        await limit(`login:email:${deps.config.siteId}:${email}`, deps.config.loginEmailLimit, deps.config.loginEmailWindowMs);
        await limit(`login:ip:${deps.config.siteId}:${ip}`, deps.config.loginIpLimit, deps.config.loginIpWindowMs);
        if (allowlist.size === 0 || !isEmailAllowed(email, allowlist)) {
            throw new HttpError(403, "email_not_allowed", "This email is not allowed to edit this site.");
        }
        const token = newToken();
        const tokenHash = hashToken(token);
        const expiresAt = new Date(now().getTime() + deps.config.magicLinkTtlMs);
        await deps.auth.saveMagicLink({
            tokenHash,
            siteId: deps.config.siteId,
            email,
            expiresAt,
        });
        const origin = requestOrigin(req);
        const url = `${origin}${matchedMarker(req)}auth/callback?token=${encodeURIComponent(token)}`;
        try {
            await deps.email.sendMagicLink({ to: email, url });
        }
        catch (error) {
            await deps.auth.deleteMagicLink(tokenHash);
            console.error("[inplace] Magic link email failed.", error);
            throw new HttpError(502, "email_failed", "The sign-in email could not be sent.");
        }
        return json({ ok: true });
    }
    async function getAuthCallback(req) {
        const token = new URL(req.url).searchParams.get("token") ?? "";
        const origin = requestOrigin(req);
        const fail = `${origin}/?inplace=invalid`;
        if (!token)
            return Response.redirect(fail, 303);
        const consumed = await deps.auth.consumeMagicLink(hashToken(token), now());
        if (!consumed || consumed.siteId !== deps.config.siteId)
            return Response.redirect(fail, 303);
        const sessionToken = newToken();
        await deps.auth.saveSession({
            tokenHash: hashToken(sessionToken),
            siteId: deps.config.siteId,
            email: consumed.email,
            expiresAt: new Date(now().getTime() + deps.config.sessionTtlMs),
        });
        const secure = isSecureOrigin(origin);
        const headers = new Headers({
            location: `${origin}/?inplace=1`,
            "cache-control": "no-store",
        });
        headers.append("set-cookie", serializeSessionCookie(sessionToken, Math.floor(deps.config.sessionTtlMs / 1000), secure));
        headers.append("set-cookie", clearNamedCookie(LEGACY_SESSION_COOKIE, secure));
        return new Response(null, { status: 303, headers });
    }
    async function postLogout(req) {
        const token = readSessionCookie(req.headers.get("cookie"));
        if (token)
            await deps.auth.deleteSession(hashToken(token));
        const secure = isSecureOrigin(requestOrigin(req));
        const headers = new Headers({ "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
        headers.append("set-cookie", clearSessionCookie(secure));
        headers.append("set-cookie", clearNamedCookie(LEGACY_SESSION_COOKIE, secure));
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
    }
}
/** JSON the editor client can read without treating the page as a crash. */
export function editorUnavailableResponse(error) {
    const code = error instanceof SchemaOutdatedError
        ? "schema_outdated"
        : error instanceof SchemaMissingError
            ? "schema_missing"
            : error instanceof DatabaseUnavailableError || isDbUnavailable(error)
                ? "database_unavailable"
                : "unavailable";
    const message = error instanceof Error ? error.message : "Inplace is unavailable.";
    console.warn("[inplace] Editor API is unavailable.", message);
    return json({ authenticated: false, open: false, enabled: false, error: code, message }, 503);
}
function toErrorResponse(error) {
    if (error instanceof HttpError) {
        const headers = {};
        if (error.status === 429)
            headers["retry-after"] = "30";
        return json({ error: error.code, message: error.message }, error.status, headers);
    }
    if (error instanceof ContentError) {
        const status = error.code === "spot_not_found" || error.code === "version_not_found" ? 404 : 400;
        return json({ error: error.code, message: error.message }, status);
    }
    if (error instanceof SchemaOutdatedError ||
        error instanceof SchemaMissingError ||
        error instanceof DatabaseUnavailableError ||
        isDbUnavailable(error)) {
        return editorUnavailableResponse(error);
    }
    console.error("[inplace] Request failed.", error);
    return json({ error: "internal", message: "Something went wrong." }, 500);
}
/** @deprecated Use createInplaceHandler. */
export const createSiteEditorHandler = createInplaceHandler;
