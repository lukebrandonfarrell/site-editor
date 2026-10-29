import "server-only";
import { isOpenEditing } from "../config.js";
import type { InplaceBootstrap } from "../types.js";

export function getInplaceBootstrap(apiBase = "/api/inplace"): InplaceBootstrap {
  return {
    open: isOpenEditing(),
    apiBase,
  };
}
