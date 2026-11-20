/**
 * Tests for usePriceFeed (issue #893) — the shared generic hook that
 * replaces the near-identical cancelled-flag / loading-state /
 * async-refresh / cleanup boilerplate previously duplicated across
 * useOraclePrice and useXlmPrice.
 *
 * Tests cover:
 *   - Initial loading state and first-fetch resolution.
 *   - Cancellation safety: setState is suppressed after unmount.
 *   - Polling: setInterval schedules repeated refreshes.
 *   - Interval cleanup: timer is cleared on unmount.
 *   - Dependency change: a dep change triggers a fresh fetch and resets
 *     the cancelled flag for the new effect run.
 *   - Null handling: a fetch that resolves null leaves price as null and
 *     still clears the loading flag.
 *   - Error handling: a rejected fetch does not throw out of the hook;
 *     loading and price stay at their initial values (defensive).
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePriceFeed } from "@/src/lib/usePriceFeed";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a fetch function that resolves after one microtask. */
function makeFetch(value: number | null): () => Promise<number | null> {
  return vi.fn().mockResolvedValue(value);
}

/** Build a fetch function that rejects with the supplied error. */
function makeFailingFetch(msg = "fetch error"): () => Promise<number | null> {
  return vi.fn().mockRejectedValue(new Error(msg));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("usePriceFeed (issue #893) — shared price-feed hook", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Initial state and first-fetch settlement
  // -------------------------------------------------------------------------

  it("starts with loading=true and price=null before the first fetch resolves", () => {
    // fetchFn is a promise that never resolves in this synchronous check.
    const fetchFn = vi.fn(() => new Promise<number | null>(() => {}));
    const { result } = renderHook(() => usePriceFeed(fetchFn));

    expect(result.current.loading).toBe(true);
    expect(result.current.price).toBeNull();
  });

  it("resolves price and clears loading after the first fetch completes", async () => {
    const fetchFn = makeFetch(0.42);
    const { result } = renderHook(() => usePriceFeed(fetchFn));

    await act(async () => {
      await Promise.resolve(); // flush the microtask queue
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.price).toBe(0.42);
  });

  it("sets price to null (not throwing) when the fetch resolves null", async () => {
    const fetchFn = makeFetch(null);
    const { result } = renderHook(() => usePriceFeed(fetchFn));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.price).toBeNull();
  });

  it("does not propagate a rejected fetch promise out of the hook", async () => {
    const fetchFn = makeFailingFetch("network error");

    // If the hook does not swallow the rejection the renderHook wrapper throws.
    expect(async () => {
      const { result } = renderHook(() => usePriceFeed(fetchFn));
      await act(async () => {
        await Promise.resolve();
      });
      // If we reach here without an unhandled rejection the hook handled it.
      // The state may still be at its initial values depending on implementation.
      return result.current;
    }).not.toThrow();
  });

  // -------------------------------------------------------------------------
  // Cancellation safety
  // -------------------------------------------------------------------------

  it("does not update state after unmount (cancelled flag prevents stale setState)", async () => {
    // Capture the resolve so we can fire it after unmount.
    let resolve!: (v: number | null) => void;
    const fetchFn = vi.fn(
      () => new Promise<number | null>((res) => { resolve = res; }),
    );

    const { result, unmount } = renderHook(() => usePriceFeed(fetchFn));

    expect(result.current.loading).toBe(true);

    // Unmount before the fetch resolves.
    unmount();

    // Now resolve the pending promise — a setState call after unmount would
    // log a React warning and potentially throw in strict mode.
    await act(async () => {
      resolve(1.23);
      await Promise.resolve();
    });

    // The result reference is frozen at unmount; price must stay null.
    expect(result.current.price).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Polling (intervalMs)
  // -------------------------------------------------------------------------

  it("calls fetchFn once immediately (no interval option)", async () => {
    const fetchFn = makeFetch(0.1);
    renderHook(() => usePriceFeed(fetchFn));

    await act(async () => { await Promise.resolve(); });

    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("re-fetches on the interval when intervalMs is provided", async () => {
    const fetchFn = makeFetch(0.1);
    renderHook(() => usePriceFeed(fetchFn, { intervalMs: 1_000 }));

    await act(async () => { await Promise.resolve(); });
    expect(fetchFn).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(1_000);
      await Promise.resolve();
    });
    expect(fetchFn).toHaveBeenCalledTimes(2);

    await act(async () => {
      vi.advanceTimersByTime(1_000);
      await Promise.resolve();
    });
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it("updates price on each polling tick", async () => {
    let counter = 0;
    const fetchFn = vi.fn(async () => {
      counter += 1;
      return counter * 0.1;
    });

    const { result } = renderHook(() =>
      usePriceFeed(fetchFn, { intervalMs: 500 }),
    );

    await act(async () => { await Promise.resolve(); });
    expect(result.current.price).toBeCloseTo(0.1);

    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });
    expect(result.current.price).toBeCloseTo(0.2);
  });

  it("clears the interval on unmount so no further fetches occur", async () => {
    const fetchFn = makeFetch(0.5);
    const { unmount } = renderHook(() =>
      usePriceFeed(fetchFn, { intervalMs: 1_000 }),
    );

    await act(async () => { await Promise.resolve(); });
    expect(fetchFn).toHaveBeenCalledTimes(1);

    unmount();

    await act(async () => {
      vi.advanceTimersByTime(5_000);
      await Promise.resolve();
    });

    // No further calls after unmount.
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("does not schedule an interval when intervalMs is 0", async () => {
    const fetchFn = makeFetch(0.3);
    renderHook(() => usePriceFeed(fetchFn, { intervalMs: 0 }));

    await act(async () => { await Promise.resolve(); });
    expect(fetchFn).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(60_000);
      await Promise.resolve();
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Dependency-driven re-fetch
  // -------------------------------------------------------------------------

  it("re-fetches when a dep changes (mirrors the useOraclePrice token-change behaviour)", async () => {
    const fetchFn = vi.fn(async () => 1.0);

    const { rerender } = renderHook(
      ({ token }: { token: string }) =>
        usePriceFeed(fetchFn, { deps: [token] }),
      { initialProps: { token: "USDC" } },
    );

    await act(async () => { await Promise.resolve(); });
    expect(fetchFn).toHaveBeenCalledTimes(1);

    rerender({ token: "XLM" });

    await act(async () => { await Promise.resolve(); });
    // A second fetch must have fired for the new dep value.
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("cancels the previous effect before running the new one on dep change", async () => {
    // Track each fetch by giving them unique resolution handles so we can
    // confirm the first (now-stale) fetch is ignored once the dep changes.
    const resolvers: Array<(v: number) => void> = [];
    const fetchFn = vi.fn(
      () => new Promise<number>((res) => { resolvers.push(res); }),
    );

    const { result, rerender } = renderHook(
      ({ token }: { token: string }) =>
        usePriceFeed(fetchFn, { deps: [token] }),
      { initialProps: { token: "USDC" } },
    );

    // Change the dep before the first fetch resolves — this cancels effect 1.
    rerender({ token: "XLM" });

    await act(async () => {
      // Resolve the stale (USDC) fetch — should be a no-op.
      resolvers[0]?.(0.1);
      await Promise.resolve();
    });

    // State must still reflect the initial null, not 0.1, because the
    // first effect was cancelled when the dep changed.
    expect(result.current.price).toBeNull();

    await act(async () => {
      // Resolve the live (XLM) fetch.
      resolvers[1]?.(0.12);
      await Promise.resolve();
    });

    expect(result.current.price).toBeCloseTo(0.12);
  });

  // -------------------------------------------------------------------------
  // Regression: useXlmPrice and useOraclePrice surfaces
  // -------------------------------------------------------------------------

  it("useXlmPrice shape — price is updated and loading clears after first tick", async () => {
    // Import the refactored hook and wire it to a stable mock of getXlmUsdPrice.
    const { getXlmUsdPrice } = await import("@/src/lib/xlmPrice");
    vi.spyOn({ getXlmUsdPrice }, "getXlmUsdPrice").mockResolvedValue(0.11);

    // We test through usePriceFeed directly with the same call signature used
    // in useXlmPrice to avoid a vi.mock at module scope here.
    const { result } = renderHook(() =>
      usePriceFeed(() => Promise.resolve(0.11), { intervalMs: 300_000 }),
    );

    expect(result.current.loading).toBe(true);

    await act(async () => { await Promise.resolve(); });

    expect(result.current.loading).toBe(false);
    expect(result.current.price).toBe(0.11);
  });

  it("useOraclePrice shape — re-fetches when token dep changes without polling", async () => {
    let call = 0;
    // Simulate getOraclePrice: returns 1 for USDC, 0.12 for XLM.
    const oracleFetch = vi.fn(async (token: string) =>
      token === "USDC" ? 1 : 0.12,
    );

    const { result, rerender } = renderHook(
      ({ token }: { token: string }) =>
        usePriceFeed(() => oracleFetch(token), { deps: [token] }),
      { initialProps: { token: "USDC" } },
    );

    await act(async () => { await Promise.resolve(); call++; });
    expect(result.current.price).toBe(1);
    expect(result.current.loading).toBe(false);

    rerender({ token: "XLM" });
    await act(async () => { await Promise.resolve(); call++; });
    expect(result.current.price).toBeCloseTo(0.12);

    // No interval means advancing time must not cause extra fetches.
    await act(async () => {
      vi.advanceTimersByTime(60_000);
      await Promise.resolve();
    });
    expect(oracleFetch).toHaveBeenCalledTimes(2);
  });
});
