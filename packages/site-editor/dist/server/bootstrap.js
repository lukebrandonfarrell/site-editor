import "server-only";
import { isOpenEditing } from "../config.js";
export function getEditorBootstrap(apiBase = "/api/site-editor") {
    return {
        open: isOpenEditing(),
        apiBase,
    };
}
