"use client";

import { useEffect } from "react";

const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return EDITABLE_TAGS.has(target.tagName) || target.isContentEditable;
}

// Generic single-key shortcut, shared across modules (not transactions-
// specific) — ignores keydown while focus is on an editable element or a
// modifier key is held, so it never hijacks typing or OS/browser shortcuts.
export function useKeyboardShortcut(key: string, onTrigger: () => void) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isEditableTarget(event.target)) return;
      if (event.key.toLowerCase() !== key.toLowerCase()) return;

      event.preventDefault();
      onTrigger();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [key, onTrigger]);
}
