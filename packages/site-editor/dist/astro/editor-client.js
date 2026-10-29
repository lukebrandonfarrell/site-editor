import { editorStyles } from "../client/styles.js";
const API = "/api/site-editor";
let mounted = false;
export function mountSiteEditor() {
    if (mounted || typeof document === "undefined")
        return;
    mounted = true;
    const style = document.createElement("style");
    style.textContent = editorStyles;
    document.head.append(style);
    const open = document.querySelector('meta[name="site-editor-open"]')?.getAttribute("content") === "true";
    const ui = createUi(open);
    document.body.append(ui.root);
    void ui.start();
}
function createUi(openByDefault) {
    const root = document.createElement("div");
    root.className = "site-editor-root";
    const launch = button("Edit", "site-editor-launch");
    const bar = document.createElement("div");
    bar.className = "site-editor-bar";
    bar.setAttribute("role", "toolbar");
    bar.hidden = true;
    const status = document.createElement("span");
    status.className = "site-editor-status";
    const undo = button("Undo");
    const history = button("History");
    const done = button("Done");
    const publish = button("Publish", "site-editor-publish");
    const logout = button("Log out");
    logout.hidden = true;
    bar.append(brand(), status, undo, history, logout, done, publish);
    const historyPanel = document.createElement("aside");
    historyPanel.className = "site-editor-history";
    historyPanel.hidden = true;
    historyPanel.setAttribute("aria-label", "Version history");
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
    root.append(launch, bar, historyPanel, dialog);
    let authenticated = false;
    let editing = false;
    let busy = false;
    launch.addEventListener("click", () => {
        if (openByDefault || authenticated)
            void enter();
        else
            dialog.hidden = false;
    });
    done.addEventListener("click", () => leave());
    publish.addEventListener("click", () => void publishDrafts());
    undo.addEventListener("click", () => void undoLast());
    history.addEventListener("click", () => {
        historyPanel.hidden = !historyPanel.hidden;
        if (!historyPanel.hidden)
            void renderHistory();
    });
    logout.addEventListener("click", () => void logOut());
    cancel.addEventListener("click", () => {
        dialog.hidden = true;
    });
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        void requestLink(email.value);
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
    async function start() {
        const session = await request("/session");
        authenticated = session.authenticated === true;
        logout.hidden = !authenticated;
        const flag = new URLSearchParams(window.location.search).get("site-editor");
        const canEdit = openByDefault || authenticated;
        launch.hidden = !canEdit && flag !== "login" && flag !== "1";
        if (flag === "login" || flag === "invalid" || (flag === "1" && !canEdit)) {
            dialog.hidden = false;
            if (flag === "invalid")
                loginStatus.textContent = "That link is invalid or expired.";
        }
        if (flag === "1" && canEdit)
            await enter();
    }
    async function enter() {
        editing = true;
        dialog.hidden = true;
        launch.hidden = true;
        bar.hidden = false;
        document.documentElement.dataset.siteEditorEditing = "true";
        for (const spot of spots())
            spot.contentEditable = "true";
        try {
            const data = await request("/content");
            const drafts = (data.drafts ?? {});
            for (const spot of spots()) {
                const id = spot.getAttribute("data-site-editor-spot");
                const draft = id ? drafts[id] : undefined;
                if (draft?.type === "text" && spot.textContent !== draft.value)
                    spot.textContent = draft.value;
            }
            status.textContent = "Editing drafts";
            await renderHistory();
        }
        catch (error) {
            status.textContent = message(error);
            status.classList.add("site-editor-error");
        }
    }
    function leave() {
        editing = false;
        bar.hidden = true;
        historyPanel.hidden = true;
        launch.hidden = false;
        delete document.documentElement.dataset.siteEditorEditing;
        for (const spot of spots())
            spot.contentEditable = "false";
    }
    async function saveDraft(id, value) {
        try {
            await request("/drafts", {
                method: "PUT",
                body: JSON.stringify({ id, content: { type: "text", value } }),
            });
            status.classList.remove("site-editor-error");
            status.textContent = "Draft saved";
        }
        catch (error) {
            status.classList.add("site-editor-error");
            status.textContent = message(error);
        }
    }
    async function publishDrafts() {
        if (busy)
            return;
        busy = true;
        status.textContent = "Publishing…";
        try {
            const data = await request("/publish", { method: "POST", body: "{}" });
            status.classList.remove("site-editor-error");
            status.textContent = `Published version ${String(data.version)}`;
            window.setTimeout(() => window.location.assign(window.location.pathname), 400);
        }
        catch (error) {
            status.classList.add("site-editor-error");
            status.textContent = message(error);
            busy = false;
        }
    }
    async function undoLast() {
        try {
            await request("/versions/undo", { method: "POST", body: "{}" });
            window.location.assign(window.location.pathname);
        }
        catch (error) {
            status.classList.add("site-editor-error");
            status.textContent = message(error);
        }
    }
    async function renderHistory() {
        const data = await request("/versions");
        const versions = (data.versions ?? []);
        undo.disabled = versions.length < 2;
        historyPanel.replaceChildren(heading("Published versions"));
        if (versions.length === 0) {
            historyPanel.append(paragraph("Nothing has been published yet."));
            return;
        }
        const list = document.createElement("ul");
        for (const version of versions) {
            const item = document.createElement("li");
            const title = document.createElement("strong");
            title.textContent = `Version ${version.version}${version.restoredFrom ? ` · restored from ${version.restoredFrom}` : ""}`;
            const meta = document.createElement("p");
            meta.textContent = `${new Date(version.createdAt).toLocaleString()} · ${version.actor ?? "Unknown"}`;
            const restore = button("Restore");
            restore.addEventListener("click", () => void restoreVersion(version.version));
            item.append(title, meta, restore);
            list.append(item);
        }
        historyPanel.append(list);
    }
    async function restoreVersion(version) {
        await request("/versions/restore", {
            method: "POST",
            body: JSON.stringify({ version }),
        });
        window.location.assign(window.location.pathname);
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
        await request("/auth/logout", { method: "POST", body: "{}" });
        window.location.assign(window.location.pathname);
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
function brand() {
    const element = document.createElement("span");
    element.className = "site-editor-brand";
    element.textContent = "Site Editor";
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
