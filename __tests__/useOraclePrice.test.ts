/**
 * Tests for src/lib/useOraclePrice.ts (#856).
 *
 * Key scenario: when the `token` argument changes the hook must immediately
 * reset `price` to null and `loading` to true, so callers never briefly show
 * the previous token's price as if it belonged to the new token.
 */

import { renderHook, waitFor } from "@testing-library/react";
import { vi, type MockedFunction } from "vitest";
import { useOraclePrice } from "../src/lib/useOraclePrice";
import * as sorostream from "../src/lib/sorostream";

// Keep a typed handle to the mock so TypeScript is happy.
const getOraclePrice = sorostream.getOraclePrice as MockedFunction<
  typeof sorostream.getOraclePrice
>;

vi.mock("../src/lib/sorostream", () => ({
  getOraclePrice: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("useOraclePrice", () => {
  it("returns loading=true and price=null on initial render", () => {
    getOraclePrice.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useOraclePrice("USDC"));

    expect(result.current.loading).toBe(true);
    expect(result.current.price).toBeNull();
  });

  it("resolves price and sets loading=false after fetch completes", async () => {
    getOraclePrice.mockResolvedValue(1.0);
    const { result } = renderHook(() => useOraclePrice("USDC"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.price).toBe(1.0);
  });

  it("sets price=null for an unknown token", async () => {
    getOraclePrice.mockResolvedValue(null);
    const { result } = renderHook(() => useOraclePrice("UNKNOWN"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.price).toBeNull();
  });

  it("resets price to null and loading to true when token changes (#856)", async () => {
    // First token resolves to 1.0.
    getOraclePrice.mockResolvedValueOnce(1.0);
    // Second token takes longer — we control resolution manually.
    let resolveSecond!: (v: number | null) => void;
    const secondFetch = new Promise<number | null>((res) => { resolveSecond = res; });
    getOraclePrice.mockReturnValueOnce(secondFetch);

    const { result, rerender } = renderHook(
      ({ token }: { token: string }) => useOraclePrice(token),
      { initialProps: { token: "USDC" } },
    );

    // Wait for USDC price to settle.
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.price).toBe(1.0);

    // Switch to a different token — before the fetch resolves, the hook must
    // already show loading=true and price=null (no stale USDC price).
    rerender({ token: "XLM" });

    expect(result.current.loading).toBe(true);
    expect(result.current.price).toBeNull();

    // Let the second fetch complete and confirm the new price appears.
    resolveSecond(0.12);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.price).toBe(0.12);
  });

  it("ignores a stale response if the token changes before it resolves", async () => {
    // First fetch (USDC) resolves late — after the token has already changed.
    let resolveStale!: (v: number | null) => void;
    const staleFetch = new Promise<number | null>((res) => { resolveStale = res; });
    getOraclePrice.mockReturnValueOnce(staleFetch);

    // Second fetch (XLM) resolves quickly.
    getOraclePrice.mockResolvedValueOnce(0.5);

    const { result, rerender } = renderHook(
      ({ token }: { token: string }) => useOraclePrice(token),
      { initialProps: { token: "USDC" } },
    );

    // Switch tokens before the first fetch resolves.
    rerender({ token: "XLM" });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.price).toBe(0.5);

    // Now resolve the stale USDC fetch — it must NOT overwrite XLM's price.
    resolveStale(999);
    // Give a tick for any state update that shouldn't happen.
    await new Promise((r) => setTimeout(r, 10));

    expect(result.current.price).toBe(0.5);
  });
});
