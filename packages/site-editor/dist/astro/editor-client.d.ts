/** Closed chrome stays hidden even when a panel sets `display`. */
export declare function shouldRevealEditor(input: {
    open: boolean;
    authenticated: boolean;
    failed: boolean;
    loginRequested: boolean;
}): boolean;
export declare function mountSiteEditor(options?: {
    injectStyles?: boolean;
}): void;
