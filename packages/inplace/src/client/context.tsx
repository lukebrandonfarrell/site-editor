"use client";

import { createContext, useContext } from "react";

export type DraftContextValue = {
  editing: boolean;
  drafts: Record<string, string>;
  /** Last known published text, including publishes from this session. */
  published: Record<string, string>;
  saveDraft: (id: string, value: string) => Promise<void>;
};

export const DraftContext = createContext<DraftContextValue>({
  editing: false,
  drafts: {},
  published: {},
  saveDraft: async () => {},
});

export function useDrafts(): DraftContextValue {
  return useContext(DraftContext);
}
