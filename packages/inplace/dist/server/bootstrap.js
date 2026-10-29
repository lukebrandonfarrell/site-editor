import "server-only";
import { isOpenEditing } from "../config.js";
export function getInplaceBootstrap(apiBase = "/api/inplace") {
    return {
        open: isOpenEditing(),
        apiBase,
    };
}
