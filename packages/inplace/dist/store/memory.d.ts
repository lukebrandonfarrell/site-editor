import type { ContentMap, SpotRecord, TextContent } from "../types.js";
import type { AuthStore, ContentStore, RateLimitStore } from "./types.js";
export declare class MemoryContentStore implements ContentStore {
    private readonly sites;
    private site;
    getSpot(siteId: string, spotId: string): Promise<SpotRecord | null>;
    insertSpot(siteId: string, spot: SpotRecord): Promise<boolean>;
    updateDraft(siteId: string, spotId: string, draft: TextContent, actor: string): Promise<boolean>;
    listSpots(siteId: string): Promise<SpotRecord[]>;
    countSpots(siteId: string): Promise<number>;
    publish(siteId: string, actor: string | null): Promise<{
        version: number;
        content: ContentMap;
        createdAt: string;
    }>;
    getVersion(siteId: string, version: number): Promise<{
        content: ContentMap;
        version: number;
        createdAt: string;
        actor: string | null;
        restoredFrom: number | null;
    } | null>;
    listVersions(siteId: string, limit: number): Promise<{
        version: number;
        createdAt: string;
        actor: string | null;
        restoredFrom: number | null;
    }[]>;
    restore(siteId: string, version: number, actor: string | null): Promise<{
        version: number;
        content: ContentMap;
        createdAt: string;
    }>;
    private appendVersion;
}
export declare class MemoryAuthStore implements AuthStore {
    private readonly links;
    private readonly sessions;
    saveMagicLink(input: {
        tokenHash: string;
        siteId: string;
        email: string;
        expiresAt: Date;
    }): Promise<void>;
    deleteMagicLink(tokenHash: string): Promise<void>;
    consumeMagicLink(tokenHash: string, now: Date): Promise<{
        siteId: string;
        email: string;
    } | null>;
    saveSession(input: {
        tokenHash: string;
        siteId: string;
        email: string;
        expiresAt: Date;
    }): Promise<void>;
    getSession(tokenHash: string, now: Date): Promise<{
        siteId: string;
        email: string;
    } | null>;
    deleteSession(tokenHash: string): Promise<void>;
}
export declare class MemoryRateLimitStore implements RateLimitStore {
    private readonly buckets;
    consume(bucket: string, nowMs: number, windowMs: number, limit: number): Promise<import("../rate-limit.js").RateDecision>;
}
