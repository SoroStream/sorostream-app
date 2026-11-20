/**
 * #843 — GlobalSearch: the search input must appear as soon as the widget is
 * opened, even with an empty query.
 *
 * BUG REPRO
 * ---------
 * Before the fix, `showDropdown` was computed as:
 *
 *   const showDropdown = open && (query || results.length > 0);
 *
 * With an empty query the expression evaluated to false, so the entire modal
 * (including the <input>) was never mounted. The setTimeout(() =>
 * inputRef.current?.focus(), 50) that runs after the button click focused null,
 * and pressing "/" had the same result.
 *
 * FIX
 * ---
 * `showDropdown = open` — the dropdown is shown whenever open is true,
 * regardless of query state. An empty-query state now shows the search
 * input with no results, which is the expected UX.
 */

import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import GlobalSearch from "../GlobalSearch";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/src/lib/sorostream", () => ({
  getMockStreams: () => [],
  getMockStreamHistory: () => [],
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GlobalSearch input visibility (#843)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("shows the search input immediately after clicking the Open search button", async () => {
    render(<GlobalSearch />);

    // Before opening — no searchbox yet.
    expect(screen.queryByRole("searchbox")).toBeNull();

    const openButton = screen.getByRole("button", { name: /open search/i });
    fireEvent.click(openButton);

    // The input must be in the DOM without needing a query typed first.
    expect(screen.getByRole("searchbox")).toBeTruthy();
  });

  it("shows the search input after the '/' keyboard shortcut", async () => {
    render(<GlobalSearch />);

    expect(screen.queryByRole("searchbox")).toBeNull();

    fireEvent.keyDown(document, { key: "/" });

    expect(screen.getByRole("searchbox")).toBeTruthy();
  });

  it("hides the search input after pressing Escape with empty query", async () => {
    render(<GlobalSearch />);

    // Open via button.
    fireEvent.click(screen.getByRole("button", { name: /open search/i }));
    expect(screen.getByRole("searchbox")).toBeTruthy();

    // Escape with empty query should close the whole widget.
    const input = screen.getByRole("searchbox");
    fireEvent.keyDown(input, { key: "Escape" });

    expect(screen.queryByRole("searchbox")).toBeNull();
  });

  it("shows no-results message after typing a query that matches nothing", async () => {
    render(<GlobalSearch />);

    fireEvent.click(screen.getByRole("button", { name: /open search/i }));

    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "xyznonexistentquery" } });

    // Advance past the debounce delay (300 ms).
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(screen.getByText(/no results found/i)).toBeTruthy();
  });
});
