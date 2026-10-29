"use client";
import { createContext, useContext } from "react";
export const DraftContext = createContext({
    editing: false,
    drafts: {},
    saveDraft: async () => { },
});
export function useDrafts() {
    return useContext(DraftContext);
}
