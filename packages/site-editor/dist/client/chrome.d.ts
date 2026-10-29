/** Closed chrome stays hidden even when a panel sets `display`. */
export declare function shouldRevealEditor(input: {
    open: boolean;
    authenticated: boolean;
    failed: boolean;
    loginRequested: boolean;
}): boolean;
/**
 * The toolbar and sign-in dialog stay hidden until the session request has
 * finished and confirmed that this visitor may see them. Production visitors
 * are not confirmed.
 */
export declare function shouldShowEditorChrome(input: {
    confirmed: boolean;
    open: boolean;
    authenticated: boolean;
    failed: boolean;
    loginRequested: boolean;
}): boolean;
