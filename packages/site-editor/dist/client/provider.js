"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { shouldShowEditorChrome } from "./chrome.js";
import { DraftContext } from "./context.js";
import { pendingChangeCount, textValueMap } from "./publish-state.js";
import { editorStyles } from "./styles.js";
import { EditorChrome } from "./toolbar.js";
async function requestJson(url, init) {
    const response = await fetch(url, {
        ...init,
        cache: "no-store",
        headers: {
            "content-type": "application/json",
            "x-site-editor": "1",
            ...(init?.headers ?? {}),
        },
    });
    const data = (await response.json().catch(() => ({})));
    if (!response.ok) {
        throw new Error(data.message || "Request failed");
    }
    return data;
}
export function SiteEditorProvider({ bootstrap, children, injectStyles = true, }) {
    const api = bootstrap.apiBase;
    const [authenticated, setAuthenticated] = useState(false);
    const [ready, setReady] = useState(false);
    const [editing, setEditing] = useState(false);
    const [minimized, setMinimized] = useState(false);
    const [started, setStarted] = useState(false);
    const [drafts, setDrafts] = useState({});
    const [publishedTexts, setPublishedTexts] = useState({});
    const [loginOpen, setLoginOpen] = useState(false);
    const [loginStatus, setLoginStatus] = useState("");
    const [loginError, setLoginError] = useState("");
    const [notice, setNotice] = useState("");
    const [phase, setPhase] = useState("idle");
    const [busy, setBusy] = useState(false);
    const [sessionFailed, setSessionFailed] = useState(false);
    const draftsRef = useRef(drafts);
    const publishedRef = useRef(publishedTexts);
    const busyRef = useRef(false);
    const confirmTimer = useRef(null);
    draftsRef.current = drafts;
    publishedRef.current = publishedTexts;
    const canEdit = !sessionFailed && (bootstrap.open || authenticated);
    const pending = pendingChangeCount(publishedTexts, drafts);
    const chromeOn = shouldShowEditorChrome({
        confirmed: ready,
        open: bootstrap.open,
        authenticated,
        failed: sessionFailed,
        loginRequested: loginOpen,
    });
    useEffect(() => {
        if (chromeOn)
            document.documentElement.dataset.siteEditorChrome = "on";
        else
            delete document.documentElement.dataset.siteEditorChrome;
        return () => {
            delete document.documentElement.dataset.siteEditorChrome;
        };
    }, [chromeOn]);
    useEffect(() => {
        if (editing)
            document.documentElement.dataset.siteEditorEditing = "true";
        else
            delete document.documentElement.dataset.siteEditorEditing;
        return () => {
            delete document.documentElement.dataset.siteEditorEditing;
        };
    }, [editing]);
    useEffect(() => () => {
        if (confirmTimer.current)
            clearTimeout(confirmTimer.current);
    }, []);
    const loadSession = useCallback(async () => {
        const response = await fetch(`${api}/session`, { cache: "no-store" });
        const data = (await response.json().catch(() => ({})));
        if (!response.ok || data.enabled === false) {
            setSessionFailed(true);
            setAuthenticated(false);
            setReady(true);
            return false;
        }
        setAuthenticated(Boolean(data.authenticated));
        setReady(true);
        return Boolean(data.authenticated);
    }, [api]);
    useEffect(() => {
        void loadSession().catch(() => {
            setSessionFailed(true);
            setReady(true);
        });
    }, [loadSession]);
    const enterEditing = useCallback(async () => {
        setLoginOpen(false);
        setNotice("");
        try {
            const data = await requestJson(`${api}/content`);
            const published = textValueMap(data.published);
            const nextDrafts = textValueMap(data.drafts);
            publishedRef.current = published;
            draftsRef.current = nextDrafts;
            setPublishedTexts(published);
            setDrafts(nextDrafts);
            setEditing(true);
            setMinimized(false);
        }
        catch (cause) {
            setNotice(cause instanceof Error ? cause.message : "Could not open the editor");
            setEditing(true);
            setMinimized(false);
        }
    }, [api]);
    useEffect(() => {
        if (!ready || started || !canEdit)
            return;
        setStarted(true);
        void enterEditing();
    }, [ready, started, canEdit, enterEditing]);
    useEffect(() => {
        if (!ready)
            return;
        const flag = new URLSearchParams(window.location.search).get("site-editor");
        if (flag === "invalid") {
            setLoginOpen(true);
            setLoginError("That link is invalid or expired.");
        }
        else if ((flag === "login" || flag === "1") && !canEdit) {
            setLoginOpen(true);
        }
    }, [ready, canEdit]);
    const saveDraft = useCallback(async (id, value) => {
        const next = { ...draftsRef.current, [id]: value };
        draftsRef.current = next;
        setDrafts(next);
        setPhase("idle");
        if (confirmTimer.current)
            clearTimeout(confirmTimer.current);
        try {
            await requestJson(`${api}/drafts`, {
                method: "PUT",
                body: JSON.stringify({ id, content: { type: "text", value } }),
            });
            setNotice("");
        }
        catch (cause) {
            setNotice(cause instanceof Error ? cause.message : "Could not save draft");
        }
    }, [api]);
    const flushFocused = useCallback(async () => {
        const active = document.activeElement;
        if (!(active instanceof HTMLElement))
            return;
        const id = active.getAttribute("data-site-editor-spot");
        if (!id)
            return;
        await saveDraft(id, active.textContent ?? "");
    }, [saveDraft]);
    const publish = useCallback(async () => {
        if (busyRef.current)
            return;
        await flushFocused();
        if (pendingChangeCount(publishedRef.current, draftsRef.current) === 0)
            return;
        busyRef.current = true;
        setBusy(true);
        setPhase("publishing");
        setNotice("");
        try {
            await requestJson(`${api}/publish`, { method: "POST", body: "{}" });
            const nextPublished = { ...publishedRef.current, ...draftsRef.current };
            publishedRef.current = nextPublished;
            setPublishedTexts(nextPublished);
            setPhase("published");
            if (confirmTimer.current)
                clearTimeout(confirmTimer.current);
            confirmTimer.current = setTimeout(() => setPhase("idle"), 2200);
        }
        catch (cause) {
            setPhase("idle");
            setNotice(cause instanceof Error ? cause.message : "Publish failed");
        }
        finally {
            busyRef.current = false;
            setBusy(false);
        }
    }, [api, flushFocused]);
    useEffect(() => {
        if (!editing || minimized)
            return;
        const onKey = (event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                void publish();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [editing, minimized, publish]);
    const requestLink = useCallback(async (address) => {
        setBusy(true);
        setLoginError("");
        setLoginStatus("");
        try {
            await requestJson(`${api}/auth/request`, {
                method: "POST",
                body: JSON.stringify({ email: address }),
            });
            setLoginStatus("Check your email for a sign-in link.");
        }
        catch (cause) {
            setLoginError(cause instanceof Error ? cause.message : "Could not send the link");
        }
        finally {
            setBusy(false);
        }
    }, [api]);
    const logout = useCallback(async () => {
        await requestJson(`${api}/auth/logout`, { method: "POST", body: "{}" });
        setAuthenticated(false);
        setLoginOpen(false);
        setNotice("");
        draftsRef.current = {};
        setDrafts({});
        if (bootstrap.open)
            return;
        setEditing(false);
        setMinimized(false);
        setStarted(false);
    }, [api, bootstrap.open]);
    const draftValue = useMemo(() => ({ editing, drafts, published: publishedTexts, saveDraft }), [editing, drafts, publishedTexts, saveDraft]);
    return (_jsxs(DraftContext.Provider, { value: draftValue, children: [injectStyles ? _jsx("style", { dangerouslySetInnerHTML: { __html: editorStyles } }) : null, children, _jsx(EditorChrome, { showBar: canEdit && editing && !minimized, minimized: canEdit && minimized, authenticated: authenticated, pending: pending, phase: phase, notice: notice, loginOpen: loginOpen && !canEdit, loginStatus: loginStatus, loginError: loginError, busy: busy, onPublish: () => void publish(), onMinimize: () => {
                    setMinimized(true);
                    setEditing(false);
                }, onShow: () => {
                    setMinimized(false);
                    setEditing(true);
                }, onLogin: requestLink, onCloseLogin: () => {
                    setLoginOpen(false);
                    setLoginError("");
                }, onLogout: () => void logout() })] }));
}
