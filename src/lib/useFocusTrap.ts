"use client";

import { useEffect, useRef, type RefObject } from "react";
import { pushModal, removeModal, isTopModal } from "./modalStack";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

/**
 * Traps keyboard focus inside `containerRef` while `active` is true.
 *
 * - On activation, the previously focused element is saved and focus moves to
 *   the first focusable element inside the container (or the container itself
 *   if none exist).
 * - Tab / Shift+Tab cycle within the container.
 * - On deactivation, focus returns to the element that was focused before the
 *   trap activated.
 * - The trap registers on the global modal stack (#647): opening a new modal
 *   closes any other open modal via its `onClose`, and only the topmost
 *   modal traps Tab.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement>,
  active: boolean,
  onClose?: () => void,
): void {
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const modalIdRef = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Register with the modal stack while active.
  useEffect(() => {
    if (!active) return;
    const id = pushModal(onCloseRef.current ? () => onCloseRef.current?.() : undefined);
    modalIdRef.current = id;
    return () => {
      removeModal(id);
      modalIdRef.current = null;
    };
  }, [active]);

  // Save the currently focused element when the trap activates.
  useEffect(() => {
    if (active) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
    }
  }, [active]);

  // Focus the first element inside the container on activation.
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const raf = requestAnimationFrame(() => {
      const focusable = getFocusableElements(container);
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        if (!container.hasAttribute("tabindex")) {
          container.setAttribute("tabindex", "-1");
        }
        container.focus();
      }
    });

    return () => cancelAnimationFrame(raf);
  }, [active, containerRef]);

  // Intercept Tab / Shift+Tab to cycle within the container.
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      if (modalIdRef.current !== null && !isTopModal(modalIdRef.current)) return;

      const focusable = getFocusableElements(container!);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    container!.addEventListener("keydown", handleKeyDown);
    return () => container!.removeEventListener("keydown", handleKeyDown);
  }, [active, containerRef]);

  // Restore focus when the trap deactivates or the component unmounts.
  // The cleanup captures values from the render where the effect was created.
  // When active transitions true→false, cleanup runs with active=true and the
  // saved previousFocusRef, correctly restoring focus.
  useEffect(() => {
    return () => {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    };
  }, [active]);
}
