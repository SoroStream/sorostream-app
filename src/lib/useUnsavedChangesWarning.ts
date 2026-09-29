"use client";

import { useEffect } from "react";

export const UNSAVED_CHANGES_MESSAGE =
  "You have unsaved changes. Are you sure you want to leave this page?";

/**
 * Warn the user before they navigate away while `isDirty` is true.
 * Covers tab close / reload / external navigation (beforeunload) and
 * in-app link clicks (confirmation dialog).
 */
export function useUnsavedChangesWarning(
  isDirty: boolean,
  message: string = UNSAVED_CHANGES_MESSAGE,
): void {
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    const handleClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (!window.confirm(message)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleClick, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, true);
    };
  }, [isDirty, message]);
}
