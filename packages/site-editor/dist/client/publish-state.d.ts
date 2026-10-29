export type PublishPhase = "idle" | "publishing" | "published";
export declare function textValueMap(content: Record<string, {
    type?: string;
    value?: string;
} | undefined> | undefined): Record<string, string>;
/** Spots whose draft text differs from the published text. */
export declare function pendingChangeCount(published: Record<string, string>, drafts: Record<string, string>): number;
export declare function publishLabel(pending: number, phase: PublishPhase): string;
export declare function publishIsQuiet(pending: number, phase: PublishPhase): boolean;
