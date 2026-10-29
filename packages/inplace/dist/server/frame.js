import { jsx as _jsx } from "react/jsx-runtime";
import "server-only";
import { getPublishedContent } from "./content.js";
export async function InplaceFrame({ children }) {
    const state = await getPublishedContent();
    return _jsx("div", { "data-inplace-source": state.source, children: children });
}
