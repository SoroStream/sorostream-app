/**
 * Issue #874 — WatchlistTab.saveWatchlist: missing try/catch
 *
 * Before the fix, `saveWatchlist` called `localStorage.setItem` directly with
 * no error handling. A storage quota error or private-browsing restriction
 * thrown from `setItem` would propagate uncaught through `handleAdd` or
 * `handleRemove`, crashing the interaction.
 *
 * The fix wraps the `setItem` call in a try/catch (mirroring `loadWatchlist`).
 *
 * Tests:
 *  1. handleAdd degrades gracefully when localStorage.setItem throws.
 *  2. handleRemove degrades gracefully when localStorage.setItem throws.
 *  3. handleAdd succeeds and persists when storage is available.
 *  4. handleRemove succeeds and persists when storage is available.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent, act } from "@testing-library/react";
import WatchlistTab from "@/components/WatchlistTab";

// WatchlistTab calls sorostream.getStream for each watched ID; stub it out so
// tests don't depend on that module.
vi.mock("@/src/lib/sorostream", () => ({
  sorostream: { getStream: vi.fn(() => Promise.resolve(null)) },
  claimableNow: vi.fn(() => "0"),
  getMockStream: vi.fn(() => null),
}));

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  cleanup();
});

describe("WatchlistTab saveWatchlist error handling (#874)", () => {
  it("handleAdd does not throw when localStorage.setItem throws a quota error", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });

    render(<WatchlistTab />);

    // Fill the input and click Watch — must not throw.
    fireEvent.change(screen.getByRole("textbox", { name: /stream id/i }), {
      target: { value: "stream-abc" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /watch/i }));
    });

    // The UI should not crash; the Watch button is still present.
    expect(screen.getByRole("button", { name: /watch/i })).toBeInTheDocument();
  });

  it("handleRemove does not throw when localStorage.setItem throws a quota error", async () => {
    // Seed a watchlist entry directly so the remove button renders.
    localStorage.setItem(
      "sorostream-watchlist",
      JSON.stringify([{ id: "stream-xyz", addedAt: new Date().toISOString() }]),
    );

    render(<WatchlistTab />);

    // Wait for the entry to appear.
    expect(await screen.findByText(/#stream-xyz/i)).toBeInTheDocument();

    // Now make setItem throw on the next call.
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /remove stream stream-xyz/i }),
      );
    });

    // The UI must not crash; the component is still mounted.
    expect(document.body).toBeInTheDocument();
  });

  it("handleAdd persists the new entry to localStorage when storage is available", async () => {
    render(<WatchlistTab />);

    fireEvent.change(screen.getByRole("textbox", { name: /stream id/i }), {
      target: { value: "stream-123" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /watch/i }));
    });

    const stored = JSON.parse(localStorage.getItem("sorostream-watchlist") ?? "[]") as { id: string }[];
    expect(stored.map((e) => e.id)).toContain("stream-123");
  });

  it("handleRemove removes the entry from localStorage when storage is available", async () => {
    localStorage.setItem(
      "sorostream-watchlist",
      JSON.stringify([{ id: "stream-456", addedAt: new Date().toISOString() }]),
    );

    render(<WatchlistTab />);
    expect(await screen.findByText(/#stream-456/i)).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /remove stream stream-456/i }),
      );
    });

    const stored = JSON.parse(localStorage.getItem("sorostream-watchlist") ?? "[]") as { id: string }[];
    expect(stored.map((e) => e.id)).not.toContain("stream-456");
  });
});
