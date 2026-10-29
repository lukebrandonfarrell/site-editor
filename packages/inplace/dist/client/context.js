"use client";
import { createContext, useContext } from "react";
export const DraftContext = createContext({
    editing: false,
    drafts: {},
    published: {},
    saveDraft: async () => { },
});
export function useDrafts() {
    return useContext(DraftContext);
}
