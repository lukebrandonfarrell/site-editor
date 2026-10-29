import { type ReactNode } from "react";
import type { SiteEditorBootstrap } from "../types.js";
export declare function SiteEditorProvider({ bootstrap, children, injectStyles, }: {
    bootstrap: SiteEditorBootstrap;
    children: ReactNode;
    /** Set false and import `@thereactnativerewind/site-editor/styles.css` instead of an inline style tag. */
    injectStyles?: boolean;
}): import("react").JSX.Element;
