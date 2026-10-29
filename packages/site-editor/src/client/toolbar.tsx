"use client";

import { useEffect, useState } from "react";
import { publishIsQuiet, publishLabel, type PublishPhase } from "./publish-state.js";

function Chevron({ direction }: { direction: "up" | "down" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d={direction === "down" ? "M3.5 6.5 8 11l4.5-4.5" : "M3.5 9.5 8 5l4.5 4.5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EditorChrome({
  showBar,
  minimized,
  authenticated,
  pending,
  phase,
  notice,
  loginOpen,
  loginStatus,
  loginError,
  busy,
  onPublish,
  onMinimize,
  onShow,
  onLogin,
  onCloseLogin,
  onLogout,
}: {
  showBar: boolean;
  minimized: boolean;
  authenticated: boolean;
  pending: number;
  phase: PublishPhase;
  notice: string;
  loginOpen: boolean;
  loginStatus: string;
  loginError: string;
  busy: boolean;
  onPublish: () => void;
  onMinimize: () => void;
  onShow: () => void;
  onLogin: (email: string) => Promise<void>;
  onCloseLogin: () => void;
  onLogout: () => void;
}) {
  const [address, setAddress] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const quiet = publishIsQuiet(pending, phase);
  const label = publishLabel(pending, phase);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [menuOpen]);

  return (
    <>
      {minimized ? (
        <button type="button" className="site-editor-launch" aria-label="Show editor" onClick={onShow}>
          <Chevron direction="up" />
        </button>
      ) : null}
      {showBar ? (
        <div className="site-editor-bar" role="toolbar" aria-label="Site Editor">
          <button type="button" className="site-editor-icon" aria-label="Hide editor" onClick={onMinimize}>
            <Chevron direction="down" />
          </button>
          {notice ? <span className="site-editor-status site-editor-error">{notice}</span> : null}
          {authenticated ? (
            <div className="site-editor-overflow" onPointerDown={(event) => event.stopPropagation()}>
              <button
                type="button"
                className="site-editor-icon"
                aria-label="More"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
              >
                ···
              </button>
              {menuOpen ? (
                <div className="site-editor-menu" role="menu">
                  <button type="button" role="menuitem" onClick={onLogout} disabled={busy}>
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          <button
            type="button"
            className={quiet ? "site-editor-publish site-editor-publish-quiet" : "site-editor-publish"}
            onClick={onPublish}
            disabled={busy || pending === 0}
            aria-live="polite"
          >
            {label}
          </button>
        </div>
      ) : null}
      {loginOpen && !authenticated ? (
        <div className="site-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="site-editor-login-title">
          <form
            className="site-editor-card"
            onSubmit={(event) => {
              event.preventDefault();
              void onLogin(address);
            }}
          >
            <h2 id="site-editor-login-title">Sign in to edit</h2>
            <p>We’ll email a one-time link. Only addresses on this site’s allowlist can sign in.</p>
            <input
              type="email"
              required
              autoFocus
              autoComplete="email"
              placeholder="you@client.com"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
            />
            {loginError ? <p className="site-editor-error">{loginError}</p> : null}
            {loginStatus ? <p>{loginStatus}</p> : null}
            <button type="submit" className="site-editor-publish" disabled={busy}>
              Email me a link
            </button>
            <button type="button" onClick={onCloseLogin}>
              Cancel
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
