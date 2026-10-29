import type { SnapshotFile } from "./types.js";
export interface SnapshotStore {
    write(snapshot: SnapshotFile): Promise<void>;
    read(siteId: string): Promise<SnapshotFile | null>;
}
export declare class MemorySnapshotStore implements SnapshotStore {
    value: SnapshotFile | null;
    write(snapshot: SnapshotFile): Promise<void>;
    read(siteId: string): Promise<SnapshotFile | null>;
}
export declare function snapshotFileCandidates(siteId: string, env?: NodeJS.ProcessEnv): string[];
export declare function snapshotReadCandidates(siteId: string, env?: NodeJS.ProcessEnv): string[];
export declare function parseSnapshot(raw: string, siteId?: string): SnapshotFile | null;
export declare class FileSnapshotStore implements SnapshotStore {
    private readonly env;
    constructor(env?: NodeJS.ProcessEnv);
    write(snapshot: SnapshotFile): Promise<void>;
    read(siteId: string): Promise<SnapshotFile | null>;
}
export declare function createSnapshotStore(env?: NodeJS.ProcessEnv): SnapshotStore;
