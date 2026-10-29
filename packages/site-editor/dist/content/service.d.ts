import type { ContentStore } from "../store/types.js";
import type { SnapshotStore } from "../snapshot.js";
import type { ContentMap, PublishResult, TextContent } from "../types.js";
export type SeedLimits = {
    maxTextLength: number;
    maxSpots: number;
};
export declare function seedSpot(store: ContentStore, siteId: string, spotId: string, seed: string, limits: SeedLimits): Promise<{
    value: string;
    created: boolean;
}>;
export declare function saveDraft(store: ContentStore, siteId: string, spotId: string, content: TextContent, actor: string): Promise<void>;
export declare function publishSite(store: ContentStore, snapshots: SnapshotStore, siteId: string, actor: string | null): Promise<PublishResult>;
export declare function restoreSite(store: ContentStore, snapshots: SnapshotStore, siteId: string, version: number, actor: string | null): Promise<PublishResult>;
export declare function undoSite(store: ContentStore, snapshots: SnapshotStore, siteId: string, actor: string | null): Promise<PublishResult>;
export declare function readPublishedOrSnapshot(store: Pick<ContentStore, "listSpots">, snapshots: SnapshotStore, siteId: string): Promise<{
    content: ContentMap;
    source: "database" | "snapshot" | "seed";
}>;
