/** Closed chrome stays hidden even when a panel sets `display`. */
export function shouldRevealEditor(input) {
    if (input.failed)
        return false;
    return input.open || input.authenticated || input.loginRequested;
}
/**
 * The toolbar and sign-in dialog stay hidden until the session request has
 * finished and confirmed that this visitor may see them. Production visitors
 * are not confirmed.
 */
export function shouldShowEditorChrome(input) {
    if (!input.confirmed)
        return false;
    return shouldRevealEditor(input);
}
