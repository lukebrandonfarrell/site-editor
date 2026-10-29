import { shouldShowEditorChrome } from "../client/chrome.js";
import {
  pendingChangeCount,
  publishIsQuiet,
  publishLabel,
  textValueMap,
  type PublishPhase,
} from "../client/publish-state.js";
import { editorStyles } from "../client/styles.js";

export { shouldRevealEditor, shouldShowEditorChrome } from "../client/chrome.js";

type TextContent = { type: "text"; value: string };

const API = "/api/inplace";
const CHEVRON_DOWN =
  '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 6.5 8 11l4.5-4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHEVRON_UP =
  '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 9.5 8 5l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

let mounted = false;

export function mountInplace(options?: { injectStyles?: boolean }): void {
  if (mounted || typeof document === "undefined") return;
  mounted = true;

  const external =
    document.querySelector('meta[name="inplace-styles"]')?.getAttribute("content") === "external" ||
    document.querySelector('meta[name="site-editor-styles"]')?.getAttribute("content") === "external";
  if (options?.injectStyles !== false && !external) {
    const style = document.createElement("style");
    style.textContent = editorStyles;
    document.head.append(style);
  }

  const open =
    document.querySelector('meta[name="inplace-open"]')?.getAttribute("content") === "true" ||
    document.querySelector('meta[name="site-editor-open"]')?.getAttribute("content") === "true";
  const ui = createUi(open);
  document.body.append(ui.root);
  void ui.start();
}

function createUi(openByDefault: boolean) {
  const root = document.createElement("div");
  root.className = "inplace-root";

  const show = iconButton(CHEVRON_UP, "Show editor", "inplace-launch");
  show.hidden = true;

  const bar = document.createElement("div");
  bar.className = "inplace-bar";
  bar.setAttribute("role", "toolbar");
  bar.setAttribute("aria-label", "Inplace");
  bar.hidden = true;
  const hide = iconButton(CHEVRON_DOWN, "Hide editor", "inplace-icon");
  const status = document.createElement("span");
  status.className = "inplace-status";
  status.hidden = true;
  const overflow = document.createElement("div");
  overflow.className = "inplace-overflow";
  overflow.hidden = true;
  const more = iconButton("", "More", "inplace-icon");
  more.textContent = "···";
  more.setAttribute("aria-haspopup", "menu");
  const menu = document.createElement("div");
  menu.className = "inplace-menu";
  menu.hidden = true;
  menu.setAttribute("role", "menu");
  const signOut = button("Sign out");
  signOut.setAttribute("role", "menuitem");
  menu.append(signOut);
  overflow.append(more, menu);
  const publish = button("Publish", "inplace-publish inplace-publish-quiet");
  publish.disabled = true;
  publish.setAttribute("aria-live", "polite");
  bar.append(hide, status, overflow, publish);

  const dialog = document.createElement("div");
  dialog.className = "inplace-dialog";
  dialog.hidden = true;
  dialog.setAttribute("role", "dialog");
  const form = document.createElement("form");
  form.className = "inplace-card";
  const email = document.createElement("input");
  email.type = "email";
  email.required = true;
  email.placeholder = "you@client.com";
  email.autocomplete = "email";
  const loginStatus = document.createElement("p");
  const send = button("Email me a link", "inplace-publish");
  send.type = "submit";
  const cancel = button("Cancel");
  form.append(
    heading("Sign in to edit"),
    paragraph("We’ll email a one-time link to an allowlisted address."),
    email,
    loginStatus,
    send,
    cancel,
  );
  dialog.append(form);

  root.append(show, bar, dialog);

  let authenticated = false;
  let editing = false;
  let busy = false;
  let phase: PublishPhase = "idle";
  let published: Record<string, string> = {};
  let drafts: Record<string, string> = {};
  let confirmTimer = 0;

  hide.addEventListener("click", () => minimize());
  show.addEventListener("click", () => reveal());
  more.addEventListener("click", (event) => {
    event.stopPropagation();
    menu.hidden = !menu.hidden;
    more.setAttribute("aria-expanded", menu.hidden ? "false" : "true");
  });
  document.addEventListener("click", (event) => {
    if (event.target instanceof Node && overflow.contains(event.target)) return;
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
    if (!editing || busy) return;
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void publishDrafts();
    }
  });

  document.addEventListener("focusout", (event) => {
    if (!editing) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.hasAttribute("data-inplace-spot")) return;
    const id = target.getAttribute("data-inplace-spot");
    if (!id) return;
    void saveDraft(id, target.textContent ?? "");
  });

  function hideChrome(): void {
    show.hidden = true;
    bar.hidden = true;
    dialog.hidden = true;
    menu.hidden = true;
    editing = false;
    delete document.documentElement.dataset.inplaceEditing;
    delete document.documentElement.dataset.inplaceChrome;
  }

  async function start(): Promise<void> {
    const params = new URLSearchParams(window.location.search);
    const flag = params.get("inplace") ?? params.get("site-editor");
    const loginRequested = flag === "login" || flag === "invalid" || flag === "1";
    try {
      const session = await request("/session");
      if (session.enabled === false) throw new Error("Inplace is disabled.");
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
      document.documentElement.dataset.inplaceChrome = "on";
      if (flag === "login" || flag === "invalid" || (flag === "1" && !(openByDefault || authenticated))) {
        dialog.hidden = false;
        if (flag === "invalid") loginStatus.textContent = "That link is invalid or expired.";
      }
      if (openByDefault || authenticated) await enter();
    } catch {
      hideChrome();
    }
  }

  async function enter(): Promise<void> {
    editing = true;
    dialog.hidden = true;
    show.hidden = true;
    bar.hidden = false;
    document.documentElement.dataset.inplaceEditing = "true";
    for (const spot of spots()) spot.contentEditable = "true";
    try {
      const data = await request("/content");
      published = textValueMap(data.published as Record<string, TextContent> | undefined);
      drafts = textValueMap(data.drafts as Record<string, TextContent> | undefined);
      applyDraftText();
      clearNotice();
    } catch (error) {
      rememberCurrentText();
      showNotice(message(error));
    }
    refreshPublish();
  }

  function minimize(): void {
    editing = false;
    bar.hidden = true;
    menu.hidden = true;
    show.hidden = false;
    delete document.documentElement.dataset.inplaceEditing;
    for (const spot of spots()) spot.contentEditable = "false";
  }

  function reveal(): void {
    editing = true;
    show.hidden = true;
    bar.hidden = false;
    document.documentElement.dataset.inplaceEditing = "true";
    for (const spot of spots()) spot.contentEditable = "true";
  }

  function applyDraftText(): void {
    for (const spot of spots()) {
      const id = spot.getAttribute("data-inplace-spot");
      if (!id) continue;
      if (published[id] === undefined) published[id] = spot.textContent ?? "";
      const draft = drafts[id];
      if (draft !== undefined && spot.textContent !== draft) spot.textContent = draft;
    }
  }

  function rememberCurrentText(): void {
    for (const spot of spots()) {
      const id = spot.getAttribute("data-inplace-spot");
      if (!id) continue;
      const value = spot.textContent ?? "";
      if (published[id] === undefined) published[id] = value;
      if (drafts[id] === undefined) drafts[id] = published[id] ?? value;
    }
  }

  function refreshPublish(): void {
    const count = pendingChangeCount(published, drafts);
    publish.textContent = publishLabel(count, phase);
    publish.disabled = busy || count === 0;
    publish.classList.toggle("inplace-publish-quiet", publishIsQuiet(count, phase));
  }

  function clearNotice(): void {
    status.hidden = true;
    status.textContent = "";
    status.classList.remove("inplace-error");
  }

  function showNotice(text: string): void {
    status.hidden = false;
    status.classList.add("inplace-error");
    status.textContent = text;
  }

  async function saveDraft(id: string, value: string): Promise<void> {
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
    } catch (error) {
      showNotice(message(error));
    }
  }

  async function flushFocused(): Promise<void> {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) return;
    const id = active.getAttribute("data-inplace-spot");
    if (!id) return;
    await saveDraft(id, active.textContent ?? "");
  }

  async function publishDrafts(): Promise<void> {
    if (busy) return;
    await flushFocused();
    if (pendingChangeCount(published, drafts) === 0) return;
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
    } catch (error) {
      phase = "idle";
      showNotice(message(error));
    } finally {
      busy = false;
      refreshPublish();
    }
  }

  async function requestLink(address: string): Promise<void> {
    loginStatus.textContent = "";
    try {
      await request("/auth/request", {
        method: "POST",
        body: JSON.stringify({ email: address }),
      });
      loginStatus.textContent = "Check your email for a sign-in link.";
    } catch (error) {
      loginStatus.textContent = message(error);
    }
  }

  async function logOut(): Promise<void> {
    menu.hidden = true;
    await request("/auth/logout", { method: "POST", body: "{}" });
    authenticated = false;
    overflow.hidden = true;
    for (const spot of spots()) {
      const id = spot.getAttribute("data-inplace-spot");
      if (!id || published[id] === undefined) continue;
      spot.textContent = published[id];
    }
    drafts = { ...published };
    phase = "idle";
    refreshPublish();
    if (openByDefault) return;
    editing = false;
    bar.hidden = true;
    show.hidden = true;
    delete document.documentElement.dataset.inplaceEditing;
    for (const spot of spots()) spot.contentEditable = "false";
  }

  return { root, start };
}

function spots(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-inplace-spot]"));
}

function button(label: string, className?: string): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.textContent = label;
  if (className) element.className = className;
  return element;
}

function iconButton(svg: string, label: string, className: string): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.className = className;
  element.setAttribute("aria-label", label);
  if (svg) element.innerHTML = svg;
  return element;
}

function heading(text: string): HTMLHeadingElement {
  const element = document.createElement("h2");
  element.textContent = text;
  return element;
}

function paragraph(text: string): HTMLParagraphElement {
  const element = document.createElement("p");
  element.textContent = text;
  return element;
}

async function request(path: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      "x-inplace": "1",
      ...(init?.headers ?? {}),
    },
  });
  const data = (await response.json().catch(() => ({}))) as { message?: string } & Record<string, unknown>;
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

/** @deprecated Use mountInplace. */
export const mountSiteEditor = mountInplace;
