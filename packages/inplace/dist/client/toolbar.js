"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { publishIsQuiet, publishLabel } from "./publish-state.js";
function Chevron({ direction }) {
    return (_jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", "aria-hidden": "true", children: _jsx("path", { d: direction === "down" ? "M3.5 6.5 8 11l4.5-4.5" : "M3.5 9.5 8 5l4.5 4.5", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round" }) }));
}
export function EditorChrome({ showBar, minimized, authenticated, pending, phase, notice, loginOpen, loginStatus, loginError, busy, onPublish, onMinimize, onShow, onLogin, onCloseLogin, onLogout, }) {
    const [address, setAddress] = useState("");
    const [menuOpen, setMenuOpen] = useState(false);
    const quiet = publishIsQuiet(pending, phase);
    const label = publishLabel(pending, phase);
    useEffect(() => {
        if (!menuOpen)
            return;
        const close = () => setMenuOpen(false);
        window.addEventListener("pointerdown", close);
        return () => window.removeEventListener("pointerdown", close);
    }, [menuOpen]);
    return (_jsxs(_Fragment, { children: [minimized ? (_jsx("button", { type: "button", className: "inplace-launch", "aria-label": "Show editor", onClick: onShow, children: _jsx(Chevron, { direction: "up" }) })) : null, showBar ? (_jsxs("div", { className: "inplace-bar", role: "toolbar", "aria-label": "Inplace", children: [_jsx("button", { type: "button", className: "inplace-icon", "aria-label": "Hide editor", onClick: onMinimize, children: _jsx(Chevron, { direction: "down" }) }), notice ? _jsx("span", { className: "inplace-status inplace-error", children: notice }) : null, authenticated ? (_jsxs("div", { className: "inplace-overflow", onPointerDown: (event) => event.stopPropagation(), children: [_jsx("button", { type: "button", className: "inplace-icon", "aria-label": "More", "aria-haspopup": "menu", "aria-expanded": menuOpen, onClick: () => setMenuOpen((open) => !open), children: "\u00B7\u00B7\u00B7" }), menuOpen ? (_jsx("div", { className: "inplace-menu", role: "menu", children: _jsx("button", { type: "button", role: "menuitem", onClick: onLogout, disabled: busy, children: "Sign out" }) })) : null] })) : null, _jsx("button", { type: "button", className: quiet ? "inplace-publish inplace-publish-quiet" : "inplace-publish", onClick: onPublish, disabled: busy || pending === 0, "aria-live": "polite", children: label })] })) : null, loginOpen && !authenticated ? (_jsx("div", { className: "inplace-dialog", role: "dialog", "aria-modal": "true", "aria-labelledby": "inplace-login-title", children: _jsxs("form", { className: "inplace-card", onSubmit: (event) => {
                        event.preventDefault();
                        void onLogin(address);
                    }, children: [_jsx("h2", { id: "inplace-login-title", children: "Sign in to edit" }), _jsx("p", { children: "We\u2019ll email a one-time link. Only addresses on this site\u2019s allowlist can sign in." }), _jsx("input", { type: "email", required: true, autoFocus: true, autoComplete: "email", placeholder: "you@client.com", value: address, onChange: (event) => setAddress(event.target.value) }), loginError ? _jsx("p", { className: "inplace-error", children: loginError }) : null, loginStatus ? _jsx("p", { children: loginStatus }) : null, _jsx("button", { type: "submit", className: "inplace-publish", disabled: busy, children: "Email me a link" }), _jsx("button", { type: "button", onClick: onCloseLogin, children: "Cancel" })] }) })) : null] }));
}
