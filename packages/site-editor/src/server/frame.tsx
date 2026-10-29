import "server-only";
import type { ReactNode } from "react";
import { getPublishedContent } from "./content.js";

export async function SiteEditorFrame({ children }: { children: ReactNode }) {
  const state = await getPublishedContent();
  return <div data-site-editor-source={state.source}>{children}</div>;
}
