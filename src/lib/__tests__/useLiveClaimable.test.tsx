import { act, render, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLiveClaimable } from "@/src/lib/useLiveClaimable";
import type { StreamData } from "@/src/lib/sorostream";

// ---------------------------------------------------------------------------
// Fixtures — two independent streams with different flow rates
// ---------------------------------------------------------------------------

const NOW = new Date("2026-06-25T00:00:00.000Z");

function makeStream(
  id: string,
  flowRate: number,
): StreamData {
  return {
    id,
    sender: "GSENDER",
    recipient: "GRECIPIENT",
    token: "USDC",
    flowRate,
    deposit: 100_000_000_000,
    startTime: new Date(NOW.getTime() - 60_000).toISOString(),
    endTime: new Date(NOW.getTime() + 86_400_000).toISOString(),
    lastWithdrawTime: new Date(NOW.getTime() - 10_000).toISOString(),
    status: "Active",
  };
}

// Stream A: flowRate = 10_000_000 stroops/s (1 unit/s)
// 10s elapsed → 100_000_000 stroops
const streamA = makeStream("A", 10_000_000);
// Stream B: flowRate = 20_000_000 stroops/s (2 units/s)
// 10s elapsed → 200_000_000 stroops
const streamB = makeStream("B", 20_000_000);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useLiveClaimable — multi-instance concurrency (issue #776)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("two instances polling different streams do not interfere", () => {
    const { result: resultA } = renderHook(
      ({ stream, active }) => useLiveClaimable(stream, active),
      { initialProps: { stream: streamA, active: true } },
    );
    const { result: resultB } = renderHook(
      ({ stream, active }) => useLiveClaimable(stream, active),
      { initialProps: { stream: streamB, active: true } },
    );

    // Initial values: both should reflect 10s elapsed at their respective rates.
    // Stream A: 10s * 10M stroops/s = 100M stroops
    // Stream B: 10s * 20M stroops/s = 200M stroops
    expect(resultA.current).toBe(100_000_000);
    expect(resultB.current).toBe(200_000_000);

    // Advance 5 seconds (the default CLAIMABLE_REFRESH_MS).
    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    // After 5s: A = 150M stroops, B = 300M stroops — each tracked independently.
    expect(resultA.current).toBe(150_000_000);
    expect(resultB.current).toBe(300_000_000);
  });

  it("pausing one instance does not stop the other from updating", () => {
    const { result: resultA, rerender: rerenderA } = renderHook(
      ({ stream, active }) => useLiveClaimable(stream, active),
      { initialProps: { stream: streamA, active: true } },
    );
    const { result: resultB } = renderHook(
      ({ stream, active }) => useLiveClaimable(stream, active),
      { initialProps: { stream: streamB, active: true } },
    );

    // Initial values.
    expect(resultA.current).toBe(100_000_000);
    expect(resultB.current).toBe(200_000_000);

    // Pause instance A.
    rerenderA({ stream: streamA, active: false });

    // Advance 5 seconds.
    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    // A should be frozen at its last value (100M), B should have advanced to 300M.
    expect(resultA.current).toBe(100_000_000);
    expect(resultB.current).toBe(300_000_000);
  });

  it("resuming a paused instance refreshes immediately and continues independently", () => {
    const { result: resultA, rerender: rerenderA } = renderHook(
      ({ stream, active }) => useLiveClaimable(stream, active),
      { initialProps: { stream: streamA, active: true } },
    );
    const { result: resultB } = renderHook(
      ({ stream, active }) => useLiveClaimable(stream, active),
      { initialProps: { stream: streamB, active: true } },
    );

    // Pause A after initial render.
    rerenderA({ stream: streamA, active: false });

    // Advance 10 seconds while A is paused.
    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    // A is frozen at 100M; B has advanced to 400M (200M + 20M/s * 10s = 400M).
    expect(resultA.current).toBe(100_000_000);
    expect(resultB.current).toBe(400_000_000);

    // Resume A — it should refresh immediately to the current value (20s elapsed = 200M stroops).
    rerenderA({ stream: streamA, active: true });

    expect(resultA.current).toBe(200_000_000);
    // B is unaffected by A's resume.
    expect(resultB.current).toBe(400_000_000);

    // Advance another 5 seconds — both should advance independently.
    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(resultA.current).toBe(250_000_000);
    expect(resultB.current).toBe(500_000_000);
  });

  it("two instances with different intervalMs each tick at their own cadence", () => {
    // A polls every 3s, B polls every 7s.
    const { result: resultA } = renderHook(
      ({ stream, active, intervalMs }) =>
        useLiveClaimable(stream, active, intervalMs),
      { initialProps: { stream: streamA, active: true, intervalMs: 3_000 } },
    );
    const { result: resultB } = renderHook(
      ({ stream, active, intervalMs }) =>
        useLiveClaimable(stream, active, intervalMs),
      { initialProps: { stream: streamB, active: true, intervalMs: 7_000 } },
    );

    // Initial: A = 100M, B = 200M
    expect(resultA.current).toBe(100_000_000);
    expect(resultB.current).toBe(200_000_000);

    // After 3s: A should tick (130M), B should NOT have ticked yet (200M).
    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    expect(resultA.current).toBe(130_000_000);
    expect(resultB.current).toBe(200_000_000);

    // After 4 more seconds (7s total): B ticks at 7s (340M), A also ticks at 6s (160M).
    act(() => {
      vi.advanceTimersByTime(4_000);
    });
    // A ticked at 3s (→130M) and 6s (→160M). B ticked at 7s (→340M).
    expect(resultA.current).toBe(160_000_000);
    expect(resultB.current).toBe(340_000_000);
  });
});
