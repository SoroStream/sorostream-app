import { describe, it, expect } from "vitest";
import type { StreamData } from "@/src/lib/sorostream";

/**
 * Unit tests for PortfolioSummaryCard calculation logic with mixed
 * inflow and outflow streams, covering active, expired, and cancelled streams.
 *
 * These tests validate the same logic used by the
 * `PortfolioSummaryCard` component's useMemo hook, extracted here
 * for isolated verification.
 */

const SECONDS_PER_MONTH = 2592000;

function formatMonthly(stroopsPerSecond: number): number {
  return (stroopsPerSecond * SECONDS_PER_MONTH) / 10_000_000;
}

interface StreamCalculationResult {
  outflow: number;
  inflow: number;
  net: number;
}

function calculatePortfolioSummary(
  streams: StreamData[],
  walletAddress: string,
): StreamCalculationResult {
  const active = streams.filter((s) => s.status === "Active");
  let out = 0;
  let inn = 0;
  for (const s of active) {
    if (s.sender.includes(walletAddress.slice(0, 5))) {
      out += s.flowRate;
    } else if (s.recipient.includes(walletAddress.slice(0, 5))) {
      inn += s.flowRate;
    }
  }
  return { outflow: out, inflow: inn, net: inn - out };
}

// Helper: create a stream object
function makeStream(
  overrides: Partial<StreamData> = {},
): StreamData {
  return {
    id: "s1",
    sender: "GBAM...BOEP",
    recipient: "GBCR...XDRL",
    token: "USDC",
    flowRate: 1000000,
    deposit: 10000000000,
    startTime: new Date(Date.now() - 86400000).toISOString(),
    endTime: new Date(Date.now() + 86400000 * 30).toISOString(),
    lastWithdrawTime: new Date(Date.now() - 86400000).toISOString(),
    status: "Active",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PortfolioSummaryCard calculation", () => {
  const WALLET = "GBAM...BOEP";

  it("calculates monthly outflow for multiple outgoing streams with different rates", () => {
    const streams: StreamData[] = [
      makeStream({ id: "out1", sender: "GBAM...BOEP", recipient: "GX1...AAAA", flowRate: 1000000 }),
      makeStream({ id: "out2", sender: "GBAM...BOEP", recipient: "GX2...BBBB", flowRate: 500000 }),
      makeStream({ id: "out3", sender: "GBAM...BOEP", recipient: "GX3...CCCC", flowRate: 200000 }),
    ];

    const result = calculatePortfolioSummary(streams, WALLET);

    expect(result.outflow).toBe(1_700_000); // 1_000_000 + 500_000 + 200_000
    expect(result.inflow).toBe(0);

    const monthlyOutflow = formatMonthly(result.outflow);
    expect(monthlyOutflow).toBeCloseTo((1_700_000 * SECONDS_PER_MONTH) / 10_000_000, 2);
  });

  it("calculates monthly inflow for multiple incoming streams with different rates", () => {
    const streams: StreamData[] = [
      makeStream({ id: "in1", sender: "GX1...AAAA", recipient: "GBAM...BOEP", flowRate: 2000000 }),
      makeStream({ id: "in2", sender: "GX2...BBBB", recipient: "GBAM...BOEP", flowRate: 750000 }),
    ];

    const result = calculatePortfolioSummary(streams, WALLET);

    expect(result.inflow).toBe(2_750_000); // 2_000_000 + 750_000
    expect(result.outflow).toBe(0);

    const monthlyInflow = formatMonthly(result.inflow);
    expect(monthlyInflow).toBeCloseTo((2_750_000 * SECONDS_PER_MONTH) / 10_000_000, 2);
  });

  it("calculates net monthly flow as inflow minus outflow for mixed streams", () => {
    const streams: StreamData[] = [
      // 3 outgoing streams (different rates)
      makeStream({ id: "o1", sender: "GBAM...BOEP", recipient: "GX1...AAAA", flowRate: 1000000 }),
      makeStream({ id: "o2", sender: "GBAM...BOEP", recipient: "GX2...BBBB", flowRate: 500000 }),
      makeStream({ id: "o3", sender: "GBAM...BOEP", recipient: "GX3...CCCC", flowRate: 300000 }),
      // 2 incoming streams
      makeStream({ id: "i1", sender: "GY1...DDDD", recipient: "GBAM...BOEP", flowRate: 2000000 }),
      makeStream({ id: "i2", sender: "GY2...EEEE", recipient: "GBAM...BOEP", flowRate: 1500000 }),
    ];

    const result = calculatePortfolioSummary(streams, WALLET);

    expect(result.outflow).toBe(1_800_000); // 1M + 500k + 300k
    expect(result.inflow).toBe(3_500_000);  // 2M + 1.5M
    expect(result.net).toBe(1_700_000);     // 3.5M - 1.8M

    // Verify net is positive (inflow > outflow)
    expect(result.net).toBeGreaterThan(0);
  });

  it("returns zero outflow and inflow when no streams match wallet", () => {
    const streams: StreamData[] = [
      makeStream({ id: "s1", sender: "GXX...XXXX", recipient: "GYY...YYYY", flowRate: 500000 }),
    ];

    const result = calculatePortfolioSummary(streams, WALLET);

    expect(result.outflow).toBe(0);
    expect(result.inflow).toBe(0);
    expect(result.net).toBe(0);
  });

  it("excludes cancelled streams from totals", () => {
    const streams: StreamData[] = [
      makeStream({ id: "out1", sender: "GBAM...BOEP", recipient: "GX1...AAAA", flowRate: 500000, status: "Active" }),
      makeStream({ id: "out2", sender: "GBAM...BOEP", recipient: "GX2...BBBB", flowRate: 400000, status: "Cancelled" }),
      makeStream({ id: "in1", sender: "GY1...DDDD", recipient: "GBAM...BOEP", flowRate: 300000, status: "Cancelled" }),
      makeStream({ id: "in2", sender: "GY2...EEEE", recipient: "GBAM...BOEP", flowRate: 600000, status: "Active" }),
    ];

    const result = calculatePortfolioSummary(streams, WALLET);

    // Only Active streams count
    expect(result.outflow).toBe(500000);
    expect(result.inflow).toBe(600000);
    expect(result.net).toBe(100000);
  });

  it("excludes expired (Ended) streams from totals", () => {
    const streams: StreamData[] = [
      makeStream({ id: "out1", sender: "GBAM...BOEP", recipient: "GX1...AAAA", flowRate: 500000, status: "Active" }),
      makeStream({ id: "out2", sender: "GBAM...BOEP", recipient: "GX2...BBBB", flowRate: 400000, status: "Ended" }),
      makeStream({ id: "in1", sender: "GY2...EEEE", recipient: "GBAM...BOEP", flowRate: 600000, status: "Active" }),
    ];

    const result = calculatePortfolioSummary(streams, WALLET);

    // Only Active streams count — Ended stream excluded
    expect(result.outflow).toBe(500000);
    expect(result.inflow).toBe(600000);
    expect(result.net).toBe(100000);
  });

  it("excludes Paused streams from totals", () => {
    const streams: StreamData[] = [
      makeStream({ id: "out1", sender: "GBAM...BOEP", recipient: "GX1...AAAA", flowRate: 500000, status: "Active" }),
      makeStream({ id: "out2", sender: "GBAM...BOEP", recipient: "GX2...BBBB", flowRate: 400000, status: "Paused" }),
      makeStream({ id: "in1", sender: "GY2...EEEE", recipient: "GBAM...BOEP", flowRate: 600000, status: "Paused" }),
    ];

    const result = calculatePortfolioSummary(streams, WALLET);

    // Only Active streams count
    expect(result.outflow).toBe(500000);
    expect(result.inflow).toBe(0);
    expect(result.net).toBe(-500000);
  });

  it("net is negative when outflow exceeds inflow", () => {
    const streams: StreamData[] = [
      makeStream({ id: "o1", sender: "GBAM...BOEP", recipient: "GX1...AAAA", flowRate: 2000000 }),
      makeStream({ id: "o2", sender: "GBAM...BOEP", recipient: "GX2...BBBB", flowRate: 1000000 }),
      makeStream({ id: "i1", sender: "GY1...DDDD", recipient: "GBAM...BOEP", flowRate: 500000 }),
    ];

    const result = calculatePortfolioSummary(streams, WALLET);

    expect(result.outflow).toBe(3_000_000);
    expect(result.inflow).toBe(500_000);
    expect(result.net).toBe(-2_500_000);
    expect(result.net).toBeLessThan(0);
  });

  it("net is zero when flows balance perfectly", () => {
    const streams: StreamData[] = [
      makeStream({ id: "o1", sender: "GBAM...BOEP", recipient: "GX1...AAAA", flowRate: 1000000 }),
      makeStream({ id: "i1", sender: "GY1...DDDD", recipient: "GBAM...BOEP", flowRate: 1000000 }),
    ];

    const result = calculatePortfolioSummary(streams, WALLET);

    expect(result.outflow).toBe(1_000_000);
    expect(result.inflow).toBe(1_000_000);
    expect(result.net).toBe(0);
  });

  it("handles empty stream list gracefully", () => {
    const result = calculatePortfolioSummary([], WALLET);

    expect(result.outflow).toBe(0);
    expect(result.inflow).toBe(0);
    expect(result.net).toBe(0);
  });

  it("handles mixed statuses — only Active are considered", () => {
    const streams: StreamData[] = [
      makeStream({ id: "o1", sender: "GBAM...BOEP", recipient: "GX1...AAAA", flowRate: 500000, status: "Active" }),
      makeStream({ id: "o2", sender: "GBAM...BOEP", recipient: "GX2...BBBB", flowRate: 300000, status: "Cancelled" }),
      makeStream({ id: "o3", sender: "GBAM...BOEP", recipient: "GX3...CCCC", flowRate: 200000, status: "Ended" }),
      makeStream({ id: "i1", sender: "GY1...DDDD", recipient: "GBAM...BOEP", flowRate: 400000, status: "Active" }),
      makeStream({ id: "i2", sender: "GY2...EEEE", recipient: "GBAM...BOEP", flowRate: 100000, status: "Paused" }),
    ];

    const result = calculatePortfolioSummary(streams, WALLET);

    // Only o1 (500k out) and i1 (400k in) are Active
    expect(result.outflow).toBe(500000);
    expect(result.inflow).toBe(400000);
    expect(result.net).toBe(-100000);
  });

  it("formatMonthly produces correct monthly totals", () => {
    // 1,000,000 stroops/s * 2,592,000 s/month / 10,000,000 = 259,200 units/month
    const monthly = formatMonthly(1_000_000);
    expect(monthly).toBeCloseTo(259200, 2);
  });
});
