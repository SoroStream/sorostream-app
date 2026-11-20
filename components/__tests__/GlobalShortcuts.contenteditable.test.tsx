/**
 * Issue #871 — GlobalShortcuts G-chord handler: contenteditable guard
 *
 * The keydown handler for G→D/S/H sequences checked `tagName` against
 * INPUT/TEXTAREA/SELECT but did not check `isContentEditable`. Typing "g"
 * then "d" inside a contenteditable element (e.g. a rich-text editor) would
 * trigger a navigation away from the page.
 *
 * The fix adds:
 *   if ((document.activeElement as HTMLElement | null)?.isContentEditable) return;
 *
 * Tests:
 *  1. G→D fires router.push when focus is on the document body (normal case).
 *  2. G→D is suppressed when focus is on an INPUT (pre-existing guard).
 *  3. G→D is suppressed when focus is on a contenteditable element (the fix).
 *  4. G→S and G→H are equally suppressed inside contenteditable.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, fireEvent } from "@testing-library/react";
import { GlobalShortcutsProvider } from "@/components/GlobalShortcuts";

// ---------------------------------------------------------------------------
// Mock next/navigation so GlobalShortcutsProvider can render without a router.
// ---------------------------------------------------------------------------

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/",
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setup() {
  render(<GlobalShortcutsProvider><div /></GlobalShortcutsProvider>);
}

/** Fire key events on `document` with a given activeElement. */
function fireSequence(
  activeEl: Element | null,
  keys: string[],
) {
  // JSDOM doesn't set document.activeElement via focus reliably for arbitrary
  // elements, so we patch it for the duration of these events.
  const originalActiveElement = Object.getOwnPropertyDescriptor(
    Document.prototype,
    "activeElement",
  )!;
  Object.defineProperty(document, "activeElement", {
    configurable: true,
    get: () => activeEl,
  });

  for (const key of keys) {
    fireEvent.keyDown(document, { key });
  }

  Object.defineProperty(document, "activeElement", originalActiveElement);
}

afterEach(() => { mockPush.mockClear(); cleanup(); });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GlobalShortcuts G-chord contenteditable guard (#871)", () => {
  it("navigates to /dashboard on G→D when focus is on the body", () => {
    setup();
    fireSequence(document.body, ["g", "d"]);
    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });

  it("does NOT navigate on G→D when an INPUT is focused (pre-existing guard)", () => {
    setup();
    const input = document.createElement("input");
    fireSequence(input, ["g", "d"]);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("does NOT navigate on G→D when a contenteditable element is focused", () => {
    setup();
    const div = document.createElement("div");
    div.contentEditable = "true";
    // isContentEditable is a computed property; set it explicitly for JSDOM.
    Object.defineProperty(div, "isContentEditable", { value: true, configurable: true });
    fireSequence(div, ["g", "d"]);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("does NOT navigate on G→S when a contenteditable element is focused", () => {
    setup();
    const div = document.createElement("div");
    div.contentEditable = "true";
    Object.defineProperty(div, "isContentEditable", { value: true, configurable: true });
    fireSequence(div, ["g", "s"]);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("does NOT navigate on G→H when a contenteditable element is focused", () => {
    setup();
    const div = document.createElement("div");
    div.contentEditable = "true";
    Object.defineProperty(div, "isContentEditable", { value: true, configurable: true });
    fireSequence(div, ["g", "h"]);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("navigates normally after focus leaves the contenteditable element", () => {
    setup();
    const div = document.createElement("div");
    div.contentEditable = "true";
    Object.defineProperty(div, "isContentEditable", { value: true, configurable: true });

    // Sequence started inside contenteditable → no navigation.
    fireSequence(div, ["g", "d"]);
    expect(mockPush).not.toHaveBeenCalled();

    // Fresh sequence with focus on body → should navigate.
    fireSequence(document.body, ["g", "d"]);
    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });
});
