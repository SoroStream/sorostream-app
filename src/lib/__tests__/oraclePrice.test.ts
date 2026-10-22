import { describe, it, expect } from "vitest";
import { getOraclePrice } from "@/src/lib/sorostream";

describe("on-chain price oracle (#420)", () => {
  it("returns 1 for USD-pegged assets", async () => {
    expect(await getOraclePrice("USDC")).toBe(1);
    expect(await getOraclePrice("usda")).toBe(1);
  });

  it("returns a snapshot price for volatile assets", async () => {
    expect(await getOraclePrice("XLM")).toBeCloseTo(0.12);
  });

  it("returns null for unknown assets", async () => {
    expect(await getOraclePrice("DOGE")).toBeNull();
  });
});
