"use client";

import { useState } from "react";
import type { VersionSummary } from "../types.js";

export function EditorChrome({
  open,
  authenticated,
  email,
  editing,
  loginOpen,
  historyOpen,
  versions,
  status,
  error,
  busy,
  onEdit,
  onDone,
  onPublish,
  onUndo,
  onRestore,
  onToggleHistory,
  onLogin,
  onCloseLogin,
  onLogout,
}: {
  open: boolean;
  authenticated: boolean;
  email: string | null;
  editing: boolean;
  loginOpen: boolean;
  historyOpen: boolean;
  versions: VersionSummary[];
  status: string;
  error: string;
  busy: boolean;
  onEdit: () => void;
  onDone: () => void;
  onPublish: () => void;
  onUndo: () => void;
  onRestore: (version: number) => void;
  onToggleHistory: () => void;
  onLogin: (email: string) => Promise<void>;
  onCloseLogin: () => void;
  onLogout: () => void;
}) {
  const [address, setAddress] = useState("");
  const showLaunch = !editing && (open || authenticated);
  const showLogin = loginOpen && !authenticated && !open;

  return (
    <>
      {showLaunch ? (
        <button type="button" className="site-editor-launch" onClick={onEdit}>
          Edit
        </button>
      ) : null}
      {editing ? (
        <div className="site-editor-bar" role="toolbar" aria-label="Site Editor">
          <span className="site-editor-brand">Site Editor</span>
          <span className={error ? "site-editor-status site-editor-error" : "site-editor-status"}>
            {error || status || (email ? email : "Preview")}
          </span>
          <button type="button" onClick={onUndo} disabled={busy || versions.length < 2}>
            Undo
          </button>
          <button type="button" onClick={onToggleHistory} disabled={busy}>
            History
          </button>
          {authenticated ? (
            <button type="button" onClick={onLogout} disabled={busy}>
              Log out
            </button>
          ) : null}
          <button type="button" onClick={onDone} disabled={busy}>
            Done
          </button>
          <button type="button" className="site-editor-publish" onClick={onPublish} disabled={busy}>
            Publish
          </button>
        </div>
      ) : null}
      {historyOpen && editing ? (
        <aside className="site-editor-history" aria-label="Version history">
          <h2>Published versions</h2>
          {versions.length === 0 ? (
            <p>Nothing has been published yet. Publish to save a snapshot you can restore.</p>
          ) : (
            <ul>
              {versions.map((version) => (
                <li key={version.version}>
                  <strong>
                    Version {version.version}
                    {version.restoredFrom ? ` · restored from ${version.restoredFrom}` : ""}
                  </strong>
                  <p>
                    {new Date(version.createdAt).toLocaleString()} · {version.actor ?? "Unknown"}
                  </p>
                  <button type="button" onClick={() => onRestore(version.version)} disabled={busy}>
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      ) : null}
      {showLogin ? (
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
            {error ? <p className="site-editor-error">{error}</p> : null}
            {status ? <p>{status}</p> : null}
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
