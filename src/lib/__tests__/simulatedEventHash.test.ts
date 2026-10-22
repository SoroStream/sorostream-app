import { describe, expect, it } from "vitest";
import { simulateNewEvent } from "@/src/lib/sorostream";

describe("simulateNewEvent transaction hash", () => {
  it("generates a 64-character hexadecimal Stellar hash without a prefix", () => {
    const event = simulateNewEvent();
    expect(event.txHash).toMatch(/^[0-9a-f]{64}$/);
  });
});
