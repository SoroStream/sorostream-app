import { describe, expect, it } from "vitest";
import type { StreamData } from "@/src/lib/sorostream";
import { buildWalletStreamsCsv, calculateStreamedStroops } from "@/src/lib/export";

function makeStream(overrides: Partial<StreamData> = {}): StreamData {
  return {
    id: "42",
    sender: "GAAAAA_SENDER",
    recipient: "GBBBBB_RECIPIENT",
    token: "USDC",
    flowRate: 10_000_000,
    deposit: 200_000_000,
    startTime: "2026-08-26T11:00:00.000Z",
    endTime: "2026-08-26T12:30:00.000Z",
    lastWithdrawTime: "2026-08-26T11:00:00.000Z",
    status: "Active",
    ...overrides,
  };
}

describe("calculateStreamedStroops", () => {
  it("caps streamed amount at the fixed deposit", () => {
    const stream = makeStream();
    expect(calculateStreamedStroops(stream, Date.parse("2026-08-26T11:30:00.000Z"))).toBe(200_000_000);
  });

  it("freezes the streamed amount at the pause timestamp", () => {
    const stream = makeStream({
      status: "Paused",
      flowRate: 1_000_000,
      pausedAt: "2026-08-26T11:00:50.000Z",
    });

    expect(calculateStreamedStroops(stream, Date.parse("2026-08-26T12:00:00.000Z"))).toBe(50_000_000);
  });
});

describe("buildWalletStreamsCsv", () => {
  it("builds a CSV with the requested wallet stream columns", () => {
    const walletStreams = [
      makeStream({
        id: "1",
        sender: "GAAAAA_TEST_WALLET",
        recipient: "GBBBBB_RECEIVER",
      }),
      makeStream({
        id: "2",
        sender: "GCCCCCC_OTHER",
        recipient: "GDDDDD_NOT_THIS",
      }),
    ];

    const { csv, rowCount, filename } = buildWalletStreamsCsv(
      walletStreams,
      "GAAAAA_TEST_WALLET",
      Date.parse("2026-08-26T11:30:00.000Z"),
    );

    expect(filename).toMatch(/^wallet-streams-GAAAAATE-2026-08-26\.csv$/);
    expect(rowCount).toBe(1);
    expect(csv).toContain("stream_id,sender,recipient,rate,start_time,end_time,total_streamed,status");
    expect(csv).toContain('"1"');
    expect(csv).toContain('"1.0000000 USDC/sec"');
    expect(csv).toContain('"20.0000000 USDC"');
  });
});
