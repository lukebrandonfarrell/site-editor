import { type ReactNode } from "react";
import type { InplaceBootstrap } from "../types.js";
export declare function InplaceProvider({ bootstrap, children, injectStyles, }: {
    bootstrap: InplaceBootstrap;
    children: ReactNode;
    /** Set false and import `@thereactnativerewind/inplace/styles.css` instead of an inline style tag. */
    injectStyles?: boolean;
}): import("react").JSX.Element;
