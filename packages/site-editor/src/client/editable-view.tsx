"use client";

import { useLayoutEffect, useRef } from "react";
import { useDrafts } from "./context.js";

export function EditableView({
  id,
  publishedValue,
  className,
}: {
  id: string;
  publishedValue: string;
  className?: string;
}) {
  const { editing, drafts, published, saveDraft } = useDrafts();
  const value = drafts[id] ?? published[id] ?? publishedValue;
  if (!editing) {
    return (
      <span data-site-editor-spot={id} className={className}>
        {value}
      </span>
    );
  }
  return (
    <EditableField
      id={id}
      className={className}
      value={value}
      onSave={(next) => saveDraft(id, next)}
    />
  );
}

function EditableField({
  id,
  value,
  className,
  onSave,
}: {
  id: string;
  value: string;
  className?: string;
  onSave: (value: string) => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || document.activeElement === element) return;
    if (element.textContent !== value) element.textContent = value;
  }, [value]);

  return (
    <span
      ref={ref}
      data-site-editor-spot={id}
      className={className}
      contentEditable
      role="textbox"
      aria-label={id}
      spellCheck
      suppressContentEditableWarning
      onBlur={(event) => {
        onSave(event.currentTarget.textContent ?? "");
      }}
    />
  );
}
