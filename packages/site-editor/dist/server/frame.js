import { jsx as _jsx } from "react/jsx-runtime";
import "server-only";
import { getPublishedContent } from "./content.js";
export async function SiteEditorFrame({ children }) {
    const state = await getPublishedContent();
    return _jsx("div", { "data-site-editor-source": state.source, children: children });
}
