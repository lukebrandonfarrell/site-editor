import "server-only";
import type { ReactNode } from "react";
import { getPublishedContent } from "./content.js";

export async function InplaceFrame({ children }: { children: ReactNode }) {
  const state = await getPublishedContent();
  return <div data-inplace-source={state.source}>{children}</div>;
}
