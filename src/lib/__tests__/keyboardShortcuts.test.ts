/**
 * Tests for #454: Keyboard shortcuts for dashboard actions.
 * Tests the useKeyboardShortcuts hook and the shortcut definitions.
 */
import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useKeyboardShortcuts, type ShortcutGroup } from "@/src/lib/useKeyboardShortcuts";

function fireKey(key: string, opts: { shift?: boolean; ctrl?: boolean } = {}) {
  document.dispatchEvent(
    new KeyboardEvent("keydown", {
      key,
      shiftKey: opts.shift ?? false,
      ctrlKey: opts.ctrl ?? false,
      bubbles: true,
    }),
  );
}

describe("#454 — useKeyboardShortcuts", () => {
  beforeEach(() => {
    // Ensure no active input is focused (shortcuts fire freely)
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });

  it("fires the action for a matching key", () => {
    const action = vi.fn();
    const groups: ShortcutGroup[] = [
      {
        title: "Test",
        shortcuts: [{ key: "n", description: "New stream", action }],
      },
    ];

    renderHook(() => useKeyboardShortcuts(groups));
    fireKey("n");
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("fires the filter toggle shortcut (f)", () => {
    const toggleFilter = vi.fn();
    const groups: ShortcutGroup[] = [
      {
        title: "Dashboard",
        shortcuts: [{ key: "f", description: "Toggle filter bar", action: toggleFilter }],
      },
    ];

    renderHook(() => useKeyboardShortcuts(groups));
    fireKey("f");
    expect(toggleFilter).toHaveBeenCalledTimes(1);
  });

  it("fires the j/k stream navigation shortcuts", () => {
    const nextStream = vi.fn();
    const prevStream = vi.fn();
    const groups: ShortcutGroup[] = [
      {
        title: "Dashboard",
        shortcuts: [
          { key: "j", description: "Next stream", action: nextStream },
          { key: "k", description: "Previous stream", action: prevStream },
        ],
      },
    ];

    renderHook(() => useKeyboardShortcuts(groups));
    fireKey("j");
    fireKey("k");
    expect(nextStream).toHaveBeenCalledTimes(1);
    expect(prevStream).toHaveBeenCalledTimes(1);
  });

  it("does NOT fire when an input is focused (ignoreWhenEditing default)", () => {
    const action = vi.fn();
    const groups: ShortcutGroup[] = [
      {
        title: "Test",
        shortcuts: [{ key: "f", description: "Toggle filter bar", action }],
      },
    ];

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    renderHook(() => useKeyboardShortcuts(groups));
    fireKey("f");
    expect(action).not.toHaveBeenCalled();

    input.blur();
    document.body.removeChild(input);
  });

  it("fires '/' shortcut even when an input is focused when ignoreWhenEditing=false", () => {
    const focusSearch = vi.fn();
    const groups: ShortcutGroup[] = [
      {
        title: "Test",
        shortcuts: [
          {
            key: "/",
            description: "Focus search",
            action: focusSearch,
            ignoreWhenEditing: false,
          },
        ],
      },
    ];

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    renderHook(() => useKeyboardShortcuts(groups));
    fireKey("/");
    expect(focusSearch).toHaveBeenCalledTimes(1);

    input.blur();
    document.body.removeChild(input);
  });

  it("fires shift+? to open shortcuts help", () => {
    const toggleHelp = vi.fn();
    const groups: ShortcutGroup[] = [
      {
        title: "Test",
        shortcuts: [
          { key: "?", shift: true, description: "Toggle shortcuts help", action: toggleHelp },
        ],
      },
    ];

    renderHook(() => useKeyboardShortcuts(groups));
    fireKey("?", { shift: true });
    expect(toggleHelp).toHaveBeenCalledTimes(1);
  });

  it("does NOT fire when modifier does not match (shift mismatch)", () => {
    const action = vi.fn();
    const groups: ShortcutGroup[] = [
      {
        title: "Test",
        shortcuts: [{ key: "?", shift: true, description: "Needs shift", action }],
      },
    ];

    renderHook(() => useKeyboardShortcuts(groups));
    // Fire without shift — should not trigger
    fireKey("?", { shift: false });
    expect(action).not.toHaveBeenCalled();
  });
});
