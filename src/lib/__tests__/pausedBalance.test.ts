import { describe, it, expect } from "vitest";
import {
  claimableNow,
  getStreamedAmount,
  getRemainingBalance,
} from "@/src/lib/sorostream";

function makeStream(
  overrides: Record<string, unknown> = {},
  baseNow: number = Date.now(),
) {
  return {
    id: "1",
    sender: "GAA",
    recipient: "GBB",
    token: "USDC",
    flowRate: 1_000_000, // 0.1 USDC / sec
    deposit: 100_000_000, // 10 USDC
    startTime: new Date(baseNow - 100_000).toISOString(),
    endTime: new Date(baseNow + 100_000).toISOString(),
    lastWithdrawTime: new Date(baseNow - 100_000).toISOString(),
    status: "Active" as const,
    ...overrides,
  };
}

describe("paused balance (#422)", () => {
  it("freezes claimable at the paused value instead of advancing", () => {
    const baseNow = Date.now();
    const pausedAt = new Date(baseNow - 50_000).toISOString(); // paused 50s in
    const stream = makeStream({ status: "Paused", pausedAt }, baseNow);

    const atPause = Number(claimableNow(stream));
    const expected = 1_000_000 * 50; // 50s * flowRate
    expect(atPause).toBe(expected);

    // Even after real time advances, the frozen value must not change.
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(Number(claimableNow(stream))).toBe(expected);
        resolve();
      }, 30);
    });
  });

  it("keeps the remaining balance frozen while paused", () => {
    const baseNow = Date.now();
    const pausedAt = new Date(baseNow - 50_000).toISOString();
    const stream = makeStream({ status: "Paused", pausedAt }, baseNow);

    const remaining = getRemainingBalance(stream);
    // deposit 100_000_000 - streamed 50_000_000 = 50_000_000
    expect(remaining).toBe(100_000_000 - 1_000_000 * 50);
    expect(getStreamedAmount(stream)).toBe(1_000_000 * 50);
  });

  it("continues advancing for active streams", () => {
    const stream = makeStream({ status: "Active" });
    const first = Number(claimableNow(stream));
    expect(first).toBeGreaterThan(0);
  });
});
