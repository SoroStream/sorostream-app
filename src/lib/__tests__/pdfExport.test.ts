import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  calculatePdfSummary,
  generatePdfDocument,
  exportStreamsPdf,
} from "../pdfExport";
import type { StreamData } from "../sorostream";

const WALLET = "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ";
const RECIPIENT = "GB7B2XS7YYUWVLXUYG6EWBEYHV4WTUY5VWFDOXWOITVNHAJBMMRV7ZGO";

const SAMPLE_STREAMS: StreamData[] = [
  {
    id: "1",
    sender: WALLET,
    recipient: RECIPIENT,
    deposit: 1000000000, // 100 USDC
    flowRate: 100,
    startTime: "2026-01-01T00:00:00.000Z",
    endTime: "2026-01-31T00:00:00.000Z",
    lastWithdrawTime: "2026-01-01T00:00:00.000Z",
    status: "Active",
    token: "USDC",
  },
  {
    id: "2",
    sender: RECIPIENT,
    recipient: WALLET,
    deposit: 2500000000, // 250 USDC
    flowRate: 250,
    startTime: "2026-02-01T00:00:00.000Z",
    endTime: "2026-02-28T00:00:00.000Z",
    lastWithdrawTime: "2026-02-01T00:00:00.000Z",
    status: "Ended",
    token: "USDC",
  },
];

describe("PDF Export Utility", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") {
      URL.createObjectURL = vi.fn().mockReturnValue("blob:http://localhost/mock");
      URL.revokeObjectURL = vi.fn();
    }
  });

  it("calculates summary totals (total sent and total received) correctly", () => {
    const summary = calculatePdfSummary(SAMPLE_STREAMS, WALLET);

    expect(summary.totalSent).toBe(100);
    expect(summary.totalReceived).toBe(250);
    expect(summary.streamCount).toBe(2);
    expect(summary.startDate).toBe("2026-01-01");
    expect(summary.endDate).toBe("2026-02-01");
    expect(summary.walletAddress).toBe(WALLET);
  });

  it("generates a valid PDF binary document string containing header and data", () => {
    const pdfDoc = generatePdfDocument(SAMPLE_STREAMS, WALLET);

    expect(pdfDoc).toContain("%PDF-1.4");
    expect(pdfDoc).toContain("SOROSTREAM - STREAM PAYMENT HISTORY REPORT");
    expect(pdfDoc).toContain("FINANCIAL SUMMARY TOTALS");
    expect(pdfDoc).toContain("Total Sent:");
    expect(pdfDoc).toContain("Total Received:");
    expect(pdfDoc).toContain("%%EOF");
  });

  it("builds correct filename including wallet address prefix and date range", () => {
    const res = exportStreamsPdf(SAMPLE_STREAMS, WALLET);
    expect(res.filename).toBe("GA7QYNF7_2026-01-01_2026-02-01.pdf");
    expect(res.mimeType).toBe("application/pdf");
  });
});
