import type { PublishResult, SpotRecord, TextContent, VersionRecord, VersionSummary } from "../types.js";
export interface ContentStore {
    getSpot(siteId: string, spotId: string): Promise<SpotRecord | null>;
    insertSpot(siteId: string, spot: SpotRecord): Promise<boolean>;
    updateDraft(siteId: string, spotId: string, draft: TextContent, actor: string): Promise<boolean>;
    listSpots(siteId: string): Promise<SpotRecord[]>;
    countSpots(siteId: string): Promise<number>;
    publish(siteId: string, actor: string | null): Promise<PublishResult>;
    getVersion(siteId: string, version: number): Promise<VersionRecord | null>;
    listVersions(siteId: string, limit: number): Promise<VersionSummary[]>;
    restore(siteId: string, version: number, actor: string | null): Promise<PublishResult>;
}
export interface AuthStore {
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
export interface RateLimitStore {
    consume(bucket: string, nowMs: number, windowMs: number, limit: number): Promise<{
        allowed: boolean;
        retryAfterMs: number;
    }>;
}
