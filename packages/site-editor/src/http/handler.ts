import { isEmailAllowed, normalizeEmail, parseAllowlist } from "../auth/allowlist.js";
import type { EmailSender } from "../auth/email.js";
import { hashToken, newToken } from "../auth/tokens.js";
import type { SiteEditorConfig } from "../config.js";
import { publishSite, restoreSite, saveDraft, undoSite } from "../content/service.js";
import {
  ContentError,
  DatabaseUnavailableError,
  HttpError,
  SchemaMissingError,
  isDbUnavailable,
} from "../errors.js";
import type { SnapshotStore } from "../snapshot.js";
import type { AuthStore, ContentStore, RateLimitStore } from "../store/types.js";
import type { ContentMap } from "../types.js";
import { draftMap, parseTextContent, publishedMap } from "../validate.js";
import { clearSessionCookie, readCookie, serializeSessionCookie, SESSION_COOKIE } from "./cookies.js";
import { isSecureOrigin, requestOrigin } from "./origin.js";

export type SiteEditorHandlerDeps = {
  content: ContentStore;
  auth: AuthStore;
  rateLimit: RateLimitStore;
  snapshots: SnapshotStore;
  email: EmailSender;
  config: SiteEditorConfig;
  revalidate?: () => Promise<void> | void;
  now?: () => Date;
};

const API_MARKER = "/api/site-editor/";

function pathSegments(req: Request): string[] {
  const pathname = new URL(req.url).pathname;
  const index = pathname.indexOf(API_MARKER);
  const rest = index >= 0 ? pathname.slice(index + API_MARKER.length) : pathname.replace(/^\//, "");
  return rest.split("/").filter(Boolean);
}

function json(body: unknown, status = 200, extra?: Record<string, string>): Response {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  if (extra) {
    for (const [key, value] of Object.entries(extra)) headers.set(key, value);
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

async function readBody(req: Request, maxBytes: number): Promise<unknown> {
  const declared = req.headers.get("content-length");
  if (declared && Number(declared) > maxBytes) {
    throw new HttpError(413, "payload_too_large", "The request body is too large.");
  }
  const buffer = await req.arrayBuffer();
  if (buffer.byteLength > maxBytes) {
    throw new HttpError(413, "payload_too_large", "The request body is too large.");
  }
  if (buffer.byteLength === 0) return {};
  try {
    return JSON.parse(new TextDecoder().decode(buffer));
  } catch {
    throw new HttpError(400, "invalid_json", "The request body must be JSON.");
  }
}

function assertEditorHeader(req: Request): void {
  if (req.headers.get("x-site-editor") !== "1") {
    throw new HttpError(403, "forbidden", "Missing editor header.");
  }
}

function assertSameOrigin(req: Request, env: NodeJS.ProcessEnv): void {
  const origin = req.headers.get("origin");
  if (!origin) return;
  if (origin !== requestOrigin(req, env)) {
    throw new HttpError(403, "bad_origin", "Cross-origin request was rejected.");
  }
}

export function createSiteEditorHandler(deps: SiteEditorHandlerDeps) {
  const now = deps.now ?? (() => new Date());
  const allowlist = parseAllowlist(deps.config.allowedEmails);

  async function requireEditor(req: Request): Promise<{ actor: string }> {
    const session = await currentSession(req);
    if (session) return { actor: session.email };
    if (deps.config.openEditing) return { actor: "preview" };
    throw new HttpError(401, "unauthorized", "Sign in to edit this site.");
  }

  async function currentSession(req: Request) {
    const token = readCookie(req.headers.get("cookie"), SESSION_COOKIE);
    if (!token) return null;
    const session = await deps.auth.getSession(hashToken(token), now());
    if (!session || session.siteId !== deps.config.siteId) return null;
    return session;
  }

  async function limit(
    bucket: string,
    limitCount: number,
    windowMs: number,
  ): Promise<void> {
    const decision = await deps.rateLimit.consume(bucket, now().getTime(), windowMs, limitCount);
    if (!decision.allowed) {
      throw new HttpError(429, "rate_limited", "Too many requests. Try again shortly.");
    }
  }

  async function revalidate(): Promise<void> {
    if (deps.revalidate) await deps.revalidate();
  }

  return async function handle(req: Request): Promise<Response> {
    try {
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
          return json({ error: "not_found", message: "Unknown Site Editor route." }, 404);
      }
    } catch (error) {
      return toErrorResponse(error);
    }
  };

  async function getSession(req: Request): Promise<Response> {
    const session = await currentSession(req);
    if (!session) return json({ authenticated: false, open: deps.config.openEditing });
    return json({ authenticated: true, email: session.email, open: deps.config.openEditing });
  }

  async function getContent(req: Request): Promise<Response> {
    const spots = await deps.content.listSpots(deps.config.siteId);
    const published = publishedMap(spots);
    let editor: { actor: string } | null = null;
    try {
      editor = await requireEditor(req);
    } catch (error) {
      if (!(error instanceof HttpError) || error.status !== 401) throw error;
    }
    const body: { published: ContentMap; canEdit: boolean; drafts?: ContentMap } = {
      published,
      canEdit: Boolean(editor),
    };
    if (editor) body.drafts = draftMap(spots);
    return json(body);
  }

  async function putDraft(req: Request): Promise<Response> {
    const editor = await requireEditor(req);
    const ip = clientIp(req);
    await limit(`save:${deps.config.siteId}:${ip}`, deps.config.saveLimit, deps.config.saveWindowMs);
    const body = (await readBody(req, deps.config.maxBodyBytes)) as { id?: unknown; content?: unknown };
    if (typeof body.id !== "string") {
      throw new HttpError(400, "invalid_content", "A spot id is required.");
    }
    const content = parseTextContent(body.content, deps.config.maxTextLength);
    await saveDraft(deps.content, deps.config.siteId, body.id, content);
    return json({ ok: true, id: body.id, actor: editor.actor });
  }

  async function postPublish(req: Request): Promise<Response> {
    const editor = await requireEditor(req);
    await limit(
      `publish:${deps.config.siteId}`,
      deps.config.publishLimit,
      deps.config.publishWindowMs,
    );
    const result = await publishSite(deps.content, deps.snapshots, deps.config.siteId, editor.actor);
    await revalidate();
    return json({ ok: true, version: result.version, publishedAt: result.createdAt });
  }

  async function getVersions(req: Request): Promise<Response> {
    await requireEditor(req);
    const versions = await deps.content.listVersions(deps.config.siteId, 50);
    return json({ versions });
  }

  async function postRestore(req: Request): Promise<Response> {
    const editor = await requireEditor(req);
    await limit(
      `publish:${deps.config.siteId}`,
      deps.config.publishLimit,
      deps.config.publishWindowMs,
    );
    const body = (await readBody(req, deps.config.maxBodyBytes)) as { version?: unknown };
    if (typeof body.version !== "number") {
      throw new HttpError(400, "invalid_content", "A version number is required.");
    }
    const result = await restoreSite(
      deps.content,
      deps.snapshots,
      deps.config.siteId,
      body.version,
      editor.actor,
    );
    await revalidate();
    return json({ ok: true, version: result.version, restoredFrom: body.version });
  }

  async function postUndo(req: Request): Promise<Response> {
    const editor = await requireEditor(req);
    await limit(
      `publish:${deps.config.siteId}`,
      deps.config.publishLimit,
      deps.config.publishWindowMs,
    );
    const result = await undoSite(deps.content, deps.snapshots, deps.config.siteId, editor.actor);
    await revalidate();
    return json({ ok: true, version: result.version });
  }

  async function postAuthRequest(req: Request): Promise<Response> {
    const ip = clientIp(req);
    const body = (await readBody(req, 4_096)) as { email?: unknown };
    if (typeof body.email !== "string") {
      throw new HttpError(400, "invalid_email", "Enter an email address.");
    }
    const email = normalizeEmail(body.email);
    if (!email) throw new HttpError(400, "invalid_email", "Enter a valid email address.");
    await limit(
      `login:email:${deps.config.siteId}:${email}`,
      deps.config.loginEmailLimit,
      deps.config.loginEmailWindowMs,
    );
    await limit(
      `login:ip:${deps.config.siteId}:${ip}`,
      deps.config.loginIpLimit,
      deps.config.loginIpWindowMs,
    );
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
    const url = `${origin}${API_MARKER}auth/callback?token=${encodeURIComponent(token)}`;
    try {
      await deps.email.sendMagicLink({ to: email, url });
    } catch (error) {
      await deps.auth.deleteMagicLink(tokenHash);
      console.error("[site-editor] Magic link email failed.", error);
      throw new HttpError(502, "email_failed", "The sign-in email could not be sent.");
    }
    return json({ ok: true });
  }

  async function getAuthCallback(req: Request): Promise<Response> {
    const token = new URL(req.url).searchParams.get("token") ?? "";
    const origin = requestOrigin(req);
    const fail = `${origin}/?site-editor=invalid`;
    if (!token) return Response.redirect(fail, 303);
    const consumed = await deps.auth.consumeMagicLink(hashToken(token), now());
    if (!consumed || consumed.siteId !== deps.config.siteId) return Response.redirect(fail, 303);
    const sessionToken = newToken();
    await deps.auth.saveSession({
      tokenHash: hashToken(sessionToken),
      siteId: deps.config.siteId,
      email: consumed.email,
      expiresAt: new Date(now().getTime() + deps.config.sessionTtlMs),
    });
    const secure = isSecureOrigin(origin);
    return new Response(null, {
      status: 303,
      headers: {
        location: `${origin}/?site-editor=1`,
        "set-cookie": serializeSessionCookie(
          sessionToken,
          Math.floor(deps.config.sessionTtlMs / 1000),
          secure,
        ),
        "cache-control": "no-store",
      },
    });
  }

  async function postLogout(req: Request): Promise<Response> {
    const token = readCookie(req.headers.get("cookie"), SESSION_COOKIE);
    if (token) await deps.auth.deleteSession(hashToken(token));
    const origin = requestOrigin(req);
    return json(
      { ok: true },
      200,
      { "set-cookie": clearSessionCookie(isSecureOrigin(origin)) },
    );
  }
}

function toErrorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    const headers: Record<string, string> = {};
    if (error.status === 429) headers["retry-after"] = "30";
    return json({ error: error.code, message: error.message }, error.status, headers);
  }
  if (error instanceof ContentError) {
    const status = error.code === "spot_not_found" || error.code === "version_not_found" ? 404 : 400;
    return json({ error: error.code, message: error.message }, status);
  }
  if (error instanceof SchemaMissingError) {
    return json({ error: error.code, message: error.message }, 503);
  }
  if (error instanceof DatabaseUnavailableError || isDbUnavailable(error)) {
    return json(
      { error: "database_unavailable", message: "The database is unreachable. Try again shortly." },
      503,
    );
  }
  console.error("[site-editor] Request failed.", error);
  return json({ error: "internal", message: "Something went wrong." }, 500);
}
