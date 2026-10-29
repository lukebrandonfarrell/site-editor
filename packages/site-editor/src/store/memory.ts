import { ContentError } from "../errors.js";
import { applyVersionContent, promoteDrafts } from "../content/transition.js";
import { consumeFixedWindow, type WindowEntry } from "../rate-limit.js";
import type { ContentMap, SpotRecord, TextContent, VersionRecord } from "../types.js";
import { sanitizeContentMap } from "../validate.js";
import type { AuthStore, ContentStore, RateLimitStore } from "./types.js";

type SiteData = {
  spots: Map<string, SpotRecord>;
  versions: VersionRecord[];
};

function cloneContent(content: TextContent): TextContent {
  return { type: "text", value: content.value };
}

function cloneSpot(spot: SpotRecord): SpotRecord {
  return {
    spotId: spot.spotId,
    draft: cloneContent(spot.draft),
    published: spot.published ? cloneContent(spot.published) : null,
  };
}

export class MemoryContentStore implements ContentStore {
  private readonly sites = new Map<string, SiteData>();

  private site(siteId: string): SiteData {
    let data = this.sites.get(siteId);
    if (!data) {
      data = { spots: new Map(), versions: [] };
      this.sites.set(siteId, data);
    }
    return data;
  }

  async getSpot(siteId: string, spotId: string): Promise<SpotRecord | null> {
    const spot = this.site(siteId).spots.get(spotId);
    return spot ? cloneSpot(spot) : null;
  }

  async insertSpot(siteId: string, spot: SpotRecord): Promise<boolean> {
    const data = this.site(siteId);
    if (data.spots.has(spot.spotId)) return false;
    data.spots.set(spot.spotId, cloneSpot(spot));
    return true;
  }

  async updateDraft(siteId: string, spotId: string, draft: TextContent): Promise<boolean> {
    const spot = this.site(siteId).spots.get(spotId);
    if (!spot) return false;
    spot.draft = cloneContent(draft);
    return true;
  }

  async listSpots(siteId: string): Promise<SpotRecord[]> {
    return [...this.site(siteId).spots.values()].map(cloneSpot);
  }

  async countSpots(siteId: string): Promise<number> {
    return this.site(siteId).spots.size;
  }

  async publish(siteId: string, actor: string | null) {
    const data = this.site(siteId);
    const promoted = promoteDrafts([...data.spots.values()]);
    data.spots = new Map(promoted.spots.map((spot) => [spot.spotId, spot]));
    return this.appendVersion(data, promoted.content, actor, null);
  }

  async getVersion(siteId: string, version: number) {
    const found = this.site(siteId).versions.find((item) => item.version === version);
    if (!found) return null;
    return {
      ...found,
      content: sanitizeContentMap(found.content),
    };
  }

  async listVersions(siteId: string, limit: number) {
    return [...this.site(siteId).versions]
      .sort((a, b) => b.version - a.version)
      .slice(0, limit)
      .map(({ version, createdAt, createdBy, restoredFrom }) => ({
        version,
        createdAt,
        createdBy,
        restoredFrom,
      }));
  }

  async restore(siteId: string, version: number, actor: string | null) {
    const data = this.site(siteId);
    const historical = data.versions.find((item) => item.version === version);
    if (!historical) {
      throw new ContentError("version_not_found", `Version ${version} was not found.`);
    }
    const nextSpots = applyVersionContent([...data.spots.values()], historical.content);
    data.spots = new Map(nextSpots.map((spot) => [spot.spotId, spot]));
    return this.appendVersion(data, sanitizeContentMap(historical.content), actor, version);
  }

  private appendVersion(
    data: SiteData,
    content: ContentMap,
    actor: string | null,
    restoredFrom: number | null,
  ) {
    const version = data.versions.reduce((max, item) => Math.max(max, item.version), 0) + 1;
    const record: VersionRecord = {
      version,
      content,
      createdAt: new Date().toISOString(),
      createdBy: actor,
      restoredFrom,
    };
    data.versions.push(record);
    return {
      version,
      content,
      createdAt: record.createdAt,
    };
  }
}

type MagicLink = {
  tokenHash: string;
  siteId: string;
  email: string;
  expiresAt: Date;
  used: boolean;
};

type Session = {
  tokenHash: string;
  siteId: string;
  email: string;
  expiresAt: Date;
};

export class MemoryAuthStore implements AuthStore {
  private readonly links = new Map<string, MagicLink>();
  private readonly sessions = new Map<string, Session>();

  async saveMagicLink(input: {
    tokenHash: string;
    siteId: string;
    email: string;
    expiresAt: Date;
  }): Promise<void> {
    this.links.set(input.tokenHash, { ...input, used: false });
  }

  async deleteMagicLink(tokenHash: string): Promise<void> {
    this.links.delete(tokenHash);
  }

  async consumeMagicLink(tokenHash: string, now: Date) {
    const link = this.links.get(tokenHash);
    if (!link || link.used || link.expiresAt.getTime() <= now.getTime()) return null;
    link.used = true;
    return { siteId: link.siteId, email: link.email };
  }

  async saveSession(input: {
    tokenHash: string;
    siteId: string;
    email: string;
    expiresAt: Date;
  }): Promise<void> {
    this.sessions.set(input.tokenHash, input);
  }

  async getSession(tokenHash: string, now: Date) {
    const session = this.sessions.get(tokenHash);
    if (!session || session.expiresAt.getTime() <= now.getTime()) return null;
    return { siteId: session.siteId, email: session.email };
  }

  async deleteSession(tokenHash: string): Promise<void> {
    this.sessions.delete(tokenHash);
  }
}

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, WindowEntry>();

  async consume(bucket: string, nowMs: number, windowMs: number, limit: number) {
    const current = this.buckets.get(bucket) ?? null;
    const result = consumeFixedWindow(current, nowMs, limit, windowMs);
    this.buckets.set(bucket, result.entry);
    return result.decision;
  }
}
