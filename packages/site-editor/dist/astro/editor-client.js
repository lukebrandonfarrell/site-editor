import { shouldShowEditorChrome } from "../client/chrome.js";
import { pendingChangeCount, publishIsQuiet, publishLabel, textValueMap, } from "../client/publish-state.js";
import { editorStyles } from "../client/styles.js";
export { shouldRevealEditor, shouldShowEditorChrome } from "../client/chrome.js";
const API = "/api/site-editor";
const CHEVRON_DOWN = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 6.5 8 11l4.5-4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHEVRON_UP = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 9.5 8 5l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
let mounted = false;
export function mountSiteEditor(options) {
    if (mounted || typeof document === "undefined")
        return;
    mounted = true;
    const external = document.querySelector('meta[name="site-editor-styles"]')?.getAttribute("content") === "external";
    if (options?.injectStyles !== false && !external) {
        const style = document.createElement("style");
        style.textContent = editorStyles;
        document.head.append(style);
    }
    const open = document.querySelector('meta[name="site-editor-open"]')?.getAttribute("content") === "true";
    const ui = createUi(open);
    document.body.append(ui.root);
    void ui.start();
}
function createUi(openByDefault) {
    const root = document.createElement("div");
    root.className = "site-editor-root";
    const show = iconButton(CHEVRON_UP, "Show editor", "site-editor-launch");
    show.hidden = true;
    const bar = document.createElement("div");
    bar.className = "site-editor-bar";
    bar.setAttribute("role", "toolbar");
    bar.setAttribute("aria-label", "Site Editor");
    bar.hidden = true;
    const hide = iconButton(CHEVRON_DOWN, "Hide editor", "site-editor-icon");
    const status = document.createElement("span");
    status.className = "site-editor-status";
    status.hidden = true;
    const overflow = document.createElement("div");
    overflow.className = "site-editor-overflow";
    overflow.hidden = true;
    const more = iconButton("", "More", "site-editor-icon");
    more.textContent = "···";
    more.setAttribute("aria-haspopup", "menu");
    const menu = document.createElement("div");
    menu.className = "site-editor-menu";
    menu.hidden = true;
    menu.setAttribute("role", "menu");
    const signOut = button("Sign out");
    signOut.setAttribute("role", "menuitem");
    menu.append(signOut);
    overflow.append(more, menu);
    const publish = button("Publish", "site-editor-publish site-editor-publish-quiet");
    publish.disabled = true;
    publish.setAttribute("aria-live", "polite");
    bar.append(hide, status, overflow, publish);
    const dialog = document.createElement("div");
    dialog.className = "site-editor-dialog";
    dialog.hidden = true;
    dialog.setAttribute("role", "dialog");
    const form = document.createElement("form");
    form.className = "site-editor-card";
    const email = document.createElement("input");
    email.type = "email";
    email.required = true;
    email.placeholder = "you@client.com";
    email.autocomplete = "email";
    const loginStatus = document.createElement("p");
    const send = button("Email me a link", "site-editor-publish");
    send.type = "submit";
    const cancel = button("Cancel");
    form.append(heading("Sign in to edit"), paragraph("We’ll email a one-time link to an allowlisted address."), email, loginStatus, send, cancel);
    dialog.append(form);
    root.append(show, bar, dialog);
    let authenticated = false;
    let editing = false;
    let busy = false;
    let phase = "idle";
    let published = {};
    let drafts = {};
    let confirmTimer = 0;
    hide.addEventListener("click", () => minimize());
    show.addEventListener("click", () => reveal());
    more.addEventListener("click", (event) => {
        event.stopPropagation();
        menu.hidden = !menu.hidden;
        more.setAttribute("aria-expanded", menu.hidden ? "false" : "true");
    });
    document.addEventListener("click", (event) => {
        if (event.target instanceof Node && overflow.contains(event.target))
            return;
        menu.hidden = true;
        more.setAttribute("aria-expanded", "false");
    });
    signOut.addEventListener("click", () => void logOut());
    publish.addEventListener("click", () => void publishDrafts());
    cancel.addEventListener("click", () => {
        dialog.hidden = true;
    });
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        void requestLink(email.value);
    });
    document.addEventListener("keydown", (event) => {
        if (!editing || busy)
            return;
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            void publishDrafts();
        }
    });
    document.addEventListener("focusout", (event) => {
        if (!editing)
            return;
        const target = event.target;
        if (!(target instanceof HTMLElement))
            return;
        if (!target.hasAttribute("data-site-editor-spot"))
            return;
        const id = target.getAttribute("data-site-editor-spot");
        if (!id)
            return;
        void saveDraft(id, target.textContent ?? "");
    });
    function hideChrome() {
        show.hidden = true;
        bar.hidden = true;
        dialog.hidden = true;
        menu.hidden = true;
        editing = false;
        delete document.documentElement.dataset.siteEditorEditing;
        delete document.documentElement.dataset.siteEditorChrome;
    }
    async function start() {
        const flag = new URLSearchParams(window.location.search).get("site-editor");
        const loginRequested = flag === "login" || flag === "invalid" || flag === "1";
        try {
            const session = await request("/session");
            if (session.enabled === false)
                throw new Error("Site Editor is disabled.");
            authenticated = session.authenticated === true;
            overflow.hidden = !authenticated;
            const canEdit = shouldShowEditorChrome({
                confirmed: true,
                open: openByDefault,
                authenticated,
                failed: false,
                loginRequested,
            });
            if (!canEdit) {
                hideChrome();
                return;
            }
            document.documentElement.dataset.siteEditorChrome = "on";
            if (flag === "login" || flag === "invalid" || (flag === "1" && !(openByDefault || authenticated))) {
                dialog.hidden = false;
                if (flag === "invalid")
                    loginStatus.textContent = "That link is invalid or expired.";
            }
            if (openByDefault || authenticated)
                await enter();
        }
        catch {
            hideChrome();
        }
    }
    async function enter() {
        editing = true;
        dialog.hidden = true;
        show.hidden = true;
        bar.hidden = false;
        document.documentElement.dataset.siteEditorEditing = "true";
        for (const spot of spots())
            spot.contentEditable = "true";
        try {
            const data = await request("/content");
            published = textValueMap(data.published);
            drafts = textValueMap(data.drafts);
            applyDraftText();
            clearNotice();
        }
        catch (error) {
            rememberCurrentText();
            showNotice(message(error));
        }
        refreshPublish();
    }
    function minimize() {
        editing = false;
        bar.hidden = true;
        menu.hidden = true;
        show.hidden = false;
        delete document.documentElement.dataset.siteEditorEditing;
        for (const spot of spots())
            spot.contentEditable = "false";
    }
    function reveal() {
        editing = true;
        show.hidden = true;
        bar.hidden = false;
        document.documentElement.dataset.siteEditorEditing = "true";
        for (const spot of spots())
            spot.contentEditable = "true";
    }
    function applyDraftText() {
        for (const spot of spots()) {
            const id = spot.getAttribute("data-site-editor-spot");
            if (!id)
                continue;
            if (published[id] === undefined)
                published[id] = spot.textContent ?? "";
            const draft = drafts[id];
            if (draft !== undefined && spot.textContent !== draft)
                spot.textContent = draft;
        }
    }
    function rememberCurrentText() {
        for (const spot of spots()) {
            const id = spot.getAttribute("data-site-editor-spot");
            if (!id)
                continue;
            const value = spot.textContent ?? "";
            if (published[id] === undefined)
                published[id] = value;
            if (drafts[id] === undefined)
                drafts[id] = published[id] ?? value;
        }
    }
    function refreshPublish() {
        const count = pendingChangeCount(published, drafts);
        publish.textContent = publishLabel(count, phase);
        publish.disabled = busy || count === 0;
        publish.classList.toggle("site-editor-publish-quiet", publishIsQuiet(count, phase));
    }
    function clearNotice() {
        status.hidden = true;
        status.textContent = "";
        status.classList.remove("site-editor-error");
    }
    function showNotice(text) {
        status.hidden = false;
        status.classList.add("site-editor-error");
        status.textContent = text;
    }
    async function saveDraft(id, value) {
        drafts[id] = value;
        phase = "idle";
        window.clearTimeout(confirmTimer);
        refreshPublish();
        try {
            await request("/drafts", {
                method: "PUT",
                body: JSON.stringify({ id, content: { type: "text", value } }),
            });
            clearNotice();
        }
        catch (error) {
            showNotice(message(error));
        }
    }
    async function flushFocused() {
        const active = document.activeElement;
        if (!(active instanceof HTMLElement))
            return;
        const id = active.getAttribute("data-site-editor-spot");
        if (!id)
            return;
        await saveDraft(id, active.textContent ?? "");
    }
    async function publishDrafts() {
        if (busy)
            return;
        await flushFocused();
        if (pendingChangeCount(published, drafts) === 0)
            return;
        busy = true;
        phase = "publishing";
        refreshPublish();
        try {
            await request("/publish", { method: "POST", body: "{}" });
            published = { ...published, ...drafts };
            phase = "published";
            clearNotice();
            window.clearTimeout(confirmTimer);
            confirmTimer = window.setTimeout(() => {
                phase = "idle";
                refreshPublish();
            }, 2200);
        }
        catch (error) {
            phase = "idle";
            showNotice(message(error));
        }
        finally {
            busy = false;
            refreshPublish();
        }
    }
    async function requestLink(address) {
        loginStatus.textContent = "";
        try {
            await request("/auth/request", {
                method: "POST",
                body: JSON.stringify({ email: address }),
            });
            loginStatus.textContent = "Check your email for a sign-in link.";
        }
        catch (error) {
            loginStatus.textContent = message(error);
        }
    }
    async function logOut() {
        menu.hidden = true;
        await request("/auth/logout", { method: "POST", body: "{}" });
        authenticated = false;
        overflow.hidden = true;
        for (const spot of spots()) {
            const id = spot.getAttribute("data-site-editor-spot");
            if (!id || published[id] === undefined)
                continue;
            spot.textContent = published[id];
        }
        drafts = { ...published };
        phase = "idle";
        refreshPublish();
        if (openByDefault)
            return;
        editing = false;
        bar.hidden = true;
        show.hidden = true;
        delete document.documentElement.dataset.siteEditorEditing;
        for (const spot of spots())
            spot.contentEditable = "false";
    }
    return { root, start };
}
function spots() {
    return Array.from(document.querySelectorAll("[data-site-editor-spot]"));
}
function button(label, className) {
    const element = document.createElement("button");
    element.type = "button";
    element.textContent = label;
    if (className)
        element.className = className;
    return element;
}
function iconButton(svg, label, className) {
    const element = document.createElement("button");
    element.type = "button";
    element.className = className;
    element.setAttribute("aria-label", label);
    if (svg)
        element.innerHTML = svg;
    return element;
}
function heading(text) {
    const element = document.createElement("h2");
    element.textContent = text;
    return element;
}
function paragraph(text) {
    const element = document.createElement("p");
    element.textContent = text;
    return element;
}
async function request(path, init) {
    const response = await fetch(`${API}${path}`, {
        ...init,
        cache: "no-store",
        headers: {
            "content-type": "application/json",
            "x-site-editor": "1",
            ...(init?.headers ?? {}),
        },
    });
    const data = (await response.json().catch(() => ({})));
    if (!response.ok)
        throw new Error(data.message || "Request failed");
    return data;
}
function message(error) {
    return error instanceof Error ? error.message : "Something went wrong";
}
