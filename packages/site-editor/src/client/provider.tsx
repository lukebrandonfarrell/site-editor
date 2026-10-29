"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { SiteEditorBootstrap, TextContent, VersionSummary } from "../types.js";
import { DraftContext } from "./context.js";
import { editorStyles } from "./styles.js";
import { EditorChrome } from "./toolbar.js";

type ContentMap = Record<string, TextContent>;

async function requestJson(url: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      "x-site-editor": "1",
      ...(init?.headers ?? {}),
    },
  });
  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
  } & Record<string, unknown>;
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

function textMap(content: ContentMap | undefined): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [id, value] of Object.entries(content ?? {})) {
    if (value?.type === "text") next[id] = value.value;
  }
  return next;
}

export function SiteEditorProvider({
  bootstrap,
  children,
  injectStyles = true,
}: {
  bootstrap: SiteEditorBootstrap;
  children: ReactNode;
  /** Set false and import `@thereactnativerewind/site-editor/styles.css` instead of an inline style tag. */
  injectStyles?: boolean;
}) {
  const router = useRouter();
  const api = bootstrap.apiBase;
  const [authenticated, setAuthenticated] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionFailed, setSessionFailed] = useState(false);

  const canEdit = !sessionFailed && (bootstrap.open || authenticated);

  useEffect(() => {
    if (editing) document.documentElement.dataset.siteEditorEditing = "true";
    else delete document.documentElement.dataset.siteEditorEditing;
    return () => {
      delete document.documentElement.dataset.siteEditorEditing;
    };
  }, [editing]);

  const loadSession = useCallback(async () => {
    const response = await fetch(`${api}/session`, { cache: "no-store" });
    const data = (await response.json().catch(() => ({}))) as {
      authenticated?: boolean;
      email?: string | null;
      enabled?: boolean;
    };
    if (!response.ok || data.enabled === false) {
      setSessionFailed(true);
      setAuthenticated(false);
      setReady(true);
      return false;
    }
    setAuthenticated(Boolean(data.authenticated));
    setEmail(data.email ?? null);
    setReady(true);
    return Boolean(data.authenticated);
  }, [api]);

  useEffect(() => {
    void loadSession().catch(() => {
      setSessionFailed(true);
      setReady(true);
    });
  }, [loadSession]);

  const loadDrafts = useCallback(async () => {
    const data = await requestJson(`${api}/content`);
    setDrafts(textMap(data.drafts as ContentMap | undefined));
  }, [api]);

  const loadVersions = useCallback(async () => {
    const data = await requestJson(`${api}/versions`);
    setVersions((data.versions as VersionSummary[] | undefined) ?? []);
  }, [api]);

  const enterEditing = useCallback(async () => {
    setError("");
    setLoginOpen(false);
    setEditing(true);
    try {
      await Promise.all([loadDrafts(), loadVersions()]);
      setStatus("Editing drafts");
    } catch (cause) {
      setEditing(false);
      setError(cause instanceof Error ? cause.message : "Could not open the editor");
    }
  }, [loadDrafts, loadVersions]);

  useEffect(() => {
    if (!ready) return;
    const flag = new URLSearchParams(window.location.search).get("site-editor");
    if (flag === "invalid") {
      setLoginOpen(true);
      setError("That link is invalid or expired.");
    } else if (flag === "login" || (flag === "1" && !canEdit)) {
      setLoginOpen(true);
    } else if (flag === "1" && canEdit) {
      void enterEditing();
    }
  }, [ready, canEdit, enterEditing]);

  const saveDraft = useCallback(
    async (id: string, value: string) => {
      setDrafts((current) => ({ ...current, [id]: value }));
      try {
        await requestJson(`${api}/drafts`, {
          method: "PUT",
          body: JSON.stringify({ id, content: { type: "text", value } }),
        });
        setStatus("Draft saved");
        setError("");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not save draft");
      }
    },
    [api],
  );

  const publish = useCallback(async () => {
    setBusy(true);
    setError("");
    setStatus("Publishing…");
    try {
      const data = await requestJson(`${api}/publish`, { method: "POST", body: "{}" });
      await Promise.all([loadDrafts(), loadVersions()]);
      setStatus(`Published version ${String(data.version)}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Publish failed");
    } finally {
      setBusy(false);
    }
  }, [api, loadDrafts, loadVersions, router]);

  const restore = useCallback(
    async (version: number) => {
      setBusy(true);
      setError("");
      try {
        const data = await requestJson(`${api}/versions/restore`, {
          method: "POST",
          body: JSON.stringify({ version }),
        });
        await Promise.all([loadDrafts(), loadVersions()]);
        setStatus(`Restored as version ${String(data.version)}`);
        setHistoryOpen(false);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Restore failed");
      } finally {
        setBusy(false);
      }
    },
    [api, loadDrafts, loadVersions, router],
  );

  const undo = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const data = await requestJson(`${api}/versions/undo`, { method: "POST", body: "{}" });
      await Promise.all([loadDrafts(), loadVersions()]);
      setStatus(`Undid to version ${String(data.version)}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Nothing to undo");
    } finally {
      setBusy(false);
    }
  }, [api, loadDrafts, loadVersions, router]);

  useEffect(() => {
    if (!editing) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        void publish();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, publish]);

  const requestLink = useCallback(
    async (address: string) => {
      setBusy(true);
      setError("");
      setStatus("");
      try {
        await requestJson(`${api}/auth/request`, {
          method: "POST",
          body: JSON.stringify({ email: address }),
        });
        setStatus("Check your email for a sign-in link.");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not send the link");
      } finally {
        setBusy(false);
      }
    },
    [api],
  );

  const logout = useCallback(async () => {
    await requestJson(`${api}/auth/logout`, { method: "POST", body: "{}" });
    setAuthenticated(false);
    setEmail(null);
    setEditing(false);
    setHistoryOpen(false);
    setStatus("");
    router.refresh();
  }, [api, router]);

  const draftValue = useMemo(
    () => ({ editing, drafts, saveDraft }),
    [editing, drafts, saveDraft],
  );

  const onEdit = () => {
    if (canEdit) void enterEditing();
    else setLoginOpen(true);
  };

  return (
    <DraftContext.Provider value={draftValue}>
      {injectStyles ? <style dangerouslySetInnerHTML={{ __html: editorStyles }} /> : null}
      {children}
      <EditorChrome
        open={bootstrap.open}
        authenticated={authenticated}
        email={email}
        editing={editing}
        loginOpen={loginOpen}
        historyOpen={historyOpen}
        versions={versions}
        status={status}
        error={error}
        busy={busy}
        onEdit={onEdit}
        onDone={() => {
          setEditing(false);
          setHistoryOpen(false);
          setStatus("");
          setError("");
        }}
        onPublish={() => void publish()}
        onUndo={() => void undo()}
        onRestore={(version) => void restore(version)}
        onToggleHistory={() => setHistoryOpen((open) => !open)}
        onLogin={requestLink}
        onCloseLogin={() => {
          setLoginOpen(false);
          setError("");
        }}
        onLogout={() => void logout()}
      />
    </DraftContext.Provider>
  );
}
