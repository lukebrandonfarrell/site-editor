import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { SnapshotFile } from "./types.js";
import { sanitizeContentMap } from "./validate.js";

export interface SnapshotStore {
  write(snapshot: SnapshotFile): Promise<void>;
  read(siteId: string): Promise<SnapshotFile | null>;
}

export class MemorySnapshotStore implements SnapshotStore {
  value: SnapshotFile | null = null;

  async write(snapshot: SnapshotFile): Promise<void> {
    this.value = snapshot;
  }

  async read(siteId: string): Promise<SnapshotFile | null> {
    if (!this.value || this.value.siteId !== siteId) return null;
    return this.value;
  }
}

function safeSiteId(siteId: string): string {
  return siteId.replace(/[^a-zA-Z0-9._:-]/g, "_");
}

export function snapshotFileCandidates(siteId: string, env: NodeJS.ProcessEnv = process.env): string[] {
  const fileName = `${safeSiteId(siteId)}.json`;
  const paths: string[] = [];
  const configured = (env.INPLACE_SNAPSHOT_PATH || env.SITE_EDITOR_SNAPSHOT_PATH)?.trim();
  if (configured) {
    paths.push(configured.endsWith(".json") ? configured : path.join(configured, fileName));
  }
  paths.push(path.join(process.cwd(), ".inplace", fileName));
  paths.push(path.join(os.tmpdir(), "inplace", fileName));
  return paths;
}

export function snapshotReadCandidates(siteId: string, env: NodeJS.ProcessEnv = process.env): string[] {
  const fileName = `${safeSiteId(siteId)}.json`;
  return [
    ...snapshotFileCandidates(siteId, env),
    path.join(process.cwd(), ".site-editor", fileName),
    path.join(os.tmpdir(), "site-editor", fileName),
  ];
}

export function parseSnapshot(raw: string, siteId?: string): SnapshotFile | null {
  try {
    const parsed = JSON.parse(raw) as Partial<SnapshotFile>;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.format !== 1 || typeof parsed.siteId !== "string") return null;
    if (siteId && parsed.siteId !== siteId) return null;
    if (typeof parsed.version !== "number" || typeof parsed.publishedAt !== "string") return null;
    return {
      format: 1,
      siteId: parsed.siteId,
      version: parsed.version,
      publishedAt: parsed.publishedAt,
      content: sanitizeContentMap(parsed.content),
    };
  } catch {
    return null;
  }
}

async function writeFileAtomic(filePath: string, body: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.tmp`;
  await writeFile(temporary, body, "utf8");
  await rename(temporary, filePath);
}

export class FileSnapshotStore implements SnapshotStore {
  constructor(private readonly env: NodeJS.ProcessEnv = process.env) {}

  async write(snapshot: SnapshotFile): Promise<void> {
    const body = JSON.stringify(snapshot);
    const errors: unknown[] = [];
    let wrote = false;
    for (const filePath of snapshotFileCandidates(snapshot.siteId, this.env)) {
      try {
        await writeFileAtomic(filePath, body);
        wrote = true;
      } catch (error) {
        const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
        if (code === "EROFS" || code === "EACCES" || code === "EPERM") {
          errors.push(error);
          continue;
        }
        errors.push(error);
      }
    }
    const blobWrote = await writeBlobSnapshot(snapshot);
    if (!wrote && !blobWrote) {
      const first = errors[0];
      throw first instanceof Error ? first : new Error("Could not write the published snapshot.");
    }
  }

  async read(siteId: string): Promise<SnapshotFile | null> {
    for (const filePath of snapshotReadCandidates(siteId, this.env)) {
      try {
        const raw = await readFile(filePath, "utf8");
        const parsed = parseSnapshot(raw, siteId);
        if (parsed) return parsed;
      } catch (error) {
        const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
        if (code === "ENOENT") continue;
      }
    }
    return readBlobSnapshot(siteId);
  }
}

type BlobModule = {
  put: (
    pathname: string,
    body: string,
    options: {
      access: "public" | "private";
      token?: string;
      addRandomSuffix?: boolean;
      allowOverwrite?: boolean;
      contentType?: string;
    },
  ) => Promise<{ url: string }>;
  get?: (
    pathname: string,
    options: { token?: string; access?: "public" | "private" },
  ) => Promise<{ statusCode: number; stream: ReadableStream<Uint8Array> | null } | null>;
};

async function loadBlob(): Promise<BlobModule | null> {
  try {
    return (await import("@vercel/blob")) as BlobModule;
  } catch {
    return null;
  }
}

function blobPath(siteId: string): string {
  return `inplace/${safeSiteId(siteId)}/snapshot.json`;
}

async function writeBlobSnapshot(snapshot: SnapshotFile): Promise<boolean> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return false;
  const blob = await loadBlob();
  if (!blob) {
    console.error("[inplace] BLOB_READ_WRITE_TOKEN is set but @vercel/blob is not installed.");
    return false;
  }
  try {
    await blob.put(blobPath(snapshot.siteId), JSON.stringify(snapshot), {
      access: "private",
      token,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    return true;
  } catch (error) {
    console.error("[inplace] Could not write the Vercel Blob snapshot.", error);
    return false;
  }
}

async function readBlobSnapshot(siteId: string): Promise<SnapshotFile | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  const blob = await loadBlob();
  if (!blob?.get) return null;
  try {
    const legacy = `site-editor/${safeSiteId(siteId)}/snapshot.json`;
    let result = await blob.get(blobPath(siteId), { token, access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) {
      result = await blob.get(legacy, { token, access: "private" });
    }
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    const raw = await new Response(result.stream).text();
    return parseSnapshot(raw, siteId);
  } catch (error) {
    console.error("[inplace] Could not read the Vercel Blob snapshot.", error);
    return null;
  }
}

export function createSnapshotStore(env: NodeJS.ProcessEnv = process.env): SnapshotStore {
  return new FileSnapshotStore(env);
}
