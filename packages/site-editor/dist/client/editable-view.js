"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { useLayoutEffect, useRef } from "react";
import { useDrafts } from "./context.js";
export function EditableView({ id, publishedValue, className, }) {
    const { editing, drafts, saveDraft } = useDrafts();
    if (!editing) {
        return (_jsx("span", { "data-site-editor-spot": id, className: className, children: publishedValue }));
    }
    return (_jsx(EditableField, { id: id, className: className, value: drafts[id] ?? publishedValue, onSave: (value) => saveDraft(id, value) }));
}
function EditableField({ id, value, className, onSave, }) {
    const ref = useRef(null);
    useLayoutEffect(() => {
        const element = ref.current;
        if (!element || document.activeElement === element)
            return;
        if (element.textContent !== value)
            element.textContent = value;
    }, [value]);
    return (_jsx("span", { ref: ref, "data-site-editor-spot": id, className: className, contentEditable: true, role: "textbox", "aria-label": id, spellCheck: true, suppressContentEditableWarning: true, onBlur: (event) => {
            onSave(event.currentTarget.textContent ?? "");
        } }));
}
