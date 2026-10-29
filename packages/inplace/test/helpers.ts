import type { InplaceConfig } from "../src/config.js";
import { createInplaceHandler, type InplaceHandlerDeps } from "../src/http/handler.js";
import { MemoryEmailSender } from "../src/auth/email.js";
import { MemorySnapshotStore } from "../src/snapshot.js";
import { MemoryAuthStore, MemoryContentStore, MemoryRateLimitStore } from "../src/store/memory.js";

export function testConfig(overrides: Partial<InplaceConfig> = {}): InplaceConfig {
  return {
    siteId: "demo",
    databaseUrl: null,
    allowedEmails: "client@example.com",
    maxTextLength: 80,
    maxBodyBytes: 500,
    maxSpots: 20,
    openEditing: true,
    fromEmail: null,
    resendApiKey: null,
    magicLinkTtlMs: 60_000,
    sessionTtlMs: 3_600_000,
    revalidatePaths: ["/"],
    loginEmailLimit: 5,
    loginEmailWindowMs: 60_000,
    loginIpLimit: 20,
    loginIpWindowMs: 60_000,
    saveLimit: 10,
    saveWindowMs: 60_000,
    publishLimit: 5,
    publishWindowMs: 60_000,
    ...overrides,
  };
}

export function testDeps(overrides: Partial<InplaceHandlerDeps> = {}) {
  const deps: InplaceHandlerDeps = {
    content: new MemoryContentStore(),
    auth: new MemoryAuthStore(),
    rateLimit: new MemoryRateLimitStore(),
    snapshots: new MemorySnapshotStore(),
    email: new MemoryEmailSender(),
    config: testConfig(),
    revalidate: () => {},
    now: () => new Date("2026-10-29T12:00:00.000Z"),
    ...overrides,
  };
  return deps;
}

export function handlerFor(deps: InplaceHandlerDeps) {
  return createInplaceHandler(deps);
}

export function editorRequest(path: string, init: RequestInit = {}): Request {
  const headers = new Headers(init.headers);
  if (init.method && init.method !== "GET") headers.set("x-inplace", "1");
  return new Request(`http://localhost${path}`, { ...init, headers });
}
