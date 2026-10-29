export type DraftContextValue = {
    editing: boolean;
    drafts: Record<string, string>;
    saveDraft: (id: string, value: string) => Promise<void>;
};
export declare const DraftContext: import("react").Context<DraftContextValue>;
export declare function useDrafts(): DraftContextValue;
