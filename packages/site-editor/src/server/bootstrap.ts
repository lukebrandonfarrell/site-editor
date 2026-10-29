import "server-only";
import { isOpenEditing } from "../config.js";
import type { SiteEditorBootstrap } from "../types.js";

export function getEditorBootstrap(apiBase = "/api/site-editor"): SiteEditorBootstrap {
  return {
    open: isOpenEditing(),
    apiBase,
  };
}
