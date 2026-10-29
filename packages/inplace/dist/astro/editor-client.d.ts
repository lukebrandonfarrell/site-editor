export { shouldRevealEditor, shouldShowEditorChrome } from "../client/chrome.js";
export declare function mountInplace(options?: {
    injectStyles?: boolean;
}): void;
/** @deprecated Use mountInplace. */
export declare const mountSiteEditor: typeof mountInplace;
