"use client";

import { createContext, useContext } from "react";

export type DraftContextValue = {
  editing: boolean;
  drafts: Record<string, string>;
  saveDraft: (id: string, value: string) => Promise<void>;
};

export const DraftContext = createContext<DraftContextValue>({
  editing: false,
  drafts: {},
  saveDraft: async () => {},
});

export function useDrafts(): DraftContextValue {
  return useContext(DraftContext);
}
