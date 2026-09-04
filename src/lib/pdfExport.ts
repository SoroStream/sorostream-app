import { downloadBlob, buildExportFilename, type ExportFilters } from "./export";
import type { StreamData } from "./sorostream";

export interface PdfExportStream {
  id: string;
  sender: string;
  recipient: string;
  amount: number; // in USDC / main token unit
  token: string;
  startTime: string;
  endTime: string;
  status: string;
}

export interface PdfReportSummary {
  totalSent: number;
  totalReceived: number;
  streamCount: number;
  startDate: string;
  endDate: string;
  walletAddress: string;
}

/**
 * Calculates financial summary totals for PDF accounting reports.
 */
export function calculatePdfSummary(
  streams: StreamData[],
  walletAddress?: string | null,
  filters: ExportFilters = {},
): PdfReportSummary {
  const account = walletAddress || "Account";
  let totalSent = 0;
  let totalReceived = 0;

  for (const s of streams) {
    const amt = typeof s.deposit === "number" ? s.deposit / 10_000_000 : parseFloat(String(s.deposit)) / 10_000_000 || 0;
    const senderMatch = s.sender.toLowerCase() === account.toLowerCase();
    const recipientMatch = s.recipient.toLowerCase() === account.toLowerCase();

    if (senderMatch) {
      totalSent += amt;
    } else if (recipientMatch) {
      totalReceived += amt;
    } else {
      // Default: attribute to total sent if wallet is unspecified
      totalSent += amt;
    }
  }

  let startDate = filters.from ? filters.from.split("T")[0] : "";
  let endDate = filters.to ? filters.to.split("T")[0] : "";

  if (!startDate || !endDate) {
    const dates = streams
      .map((s) => new Date(s.startTime).getTime())
      .filter((t) => !isNaN(t));
    if (dates.length > 0) {
      if (!startDate) startDate = new Date(Math.min(...dates)).toISOString().split("T")[0];
      if (!endDate) endDate = new Date(Math.max(...dates)).toISOString().split("T")[0];
    } else {
      const today = new Date().toISOString().split("T")[0];
      startDate = startDate || today;
      endDate = endDate || today;
    }
  }

  return {
    totalSent,
    totalReceived,
    streamCount: streams.length,
    startDate,
    endDate,
    walletAddress: account,
  };
}

/**
 * Escapes text strings for PDF stream syntax.
 */
function escapePdfText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/**
 * Generates client-side PDF binary document formatted for tax/accounting reports.
 */
export function generatePdfDocument(
  streams: StreamData[],
  walletAddress?: string | null,
  filters: ExportFilters = {},
): string {
  const summary = calculatePdfSummary(streams, walletAddress, filters);
  const sanitizeAddr = (addr: string) =>
    addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-6)}` : addr;

  const contentLines: string[] = [];

  // Header Box / Branding
  contentLines.push("0.1 0.5 0.3 rg"); // Dark green header bar
  contentLines.push("40 730 532 40 re f");

  contentLines.push("BT /F2 16 Tf 1 1 1 rg 52 745 Td (SOROSTREAM - STREAM PAYMENT HISTORY REPORT) Tj ET");
  contentLines.push("BT /F1 9 Tf 1 1 1 rg 400 745 Td (GENERATED CLIENT-SIDE) Tj ET");

  // Metadata Section
  contentLines.push("BT /F2 11 Tf 0.1 0.1 0.1 rg 40 700 Td (Wallet Address:) Tj ET");
  contentLines.push(`BT /F1 10 Tf 0.2 0.2 0.2 rg 140 700 Td (${escapePdfText(summary.walletAddress)}) Tj ET`);

  contentLines.push("BT /F2 11 Tf 0.1 0.1 0.1 rg 40 682 Td (Date Range:) Tj ET");
  contentLines.push(`BT /F1 10 Tf 0.2 0.2 0.2 rg 140 682 Td (${escapePdfText(summary.startDate)} to ${escapePdfText(summary.endDate)}) Tj ET`);

  // Summary Totals Box
  contentLines.push("0.94 0.96 0.94 rg"); // Light green summary box background
  contentLines.push("40 615 532 50 re f");
  contentLines.push("0.7 0.8 0.7 RG 1 w");
  contentLines.push("40 615 532 50 re s");

  contentLines.push("BT /F2 10 Tf 0.1 0.4 0.2 rg 55 648 Td (FINANCIAL SUMMARY TOTALS) Tj ET");

  contentLines.push("BT /F1 10 Tf 0.2 0.2 0.2 rg 55 628 Td (Total Streams: ) Tj ET");
  contentLines.push(`BT /F2 10 Tf 0.1 0.1 0.1 rg 130 628 Td (${summary.streamCount}) Tj ET`);

  contentLines.push("BT /F1 10 Tf 0.2 0.2 0.2 rg 230 628 Td (Total Sent: ) Tj ET");
  contentLines.push(`BT /F2 10 Tf 0.1 0.5 0.2 rg 295 628 Td (${summary.totalSent.toFixed(2)} USDC) Tj ET`);

  contentLines.push("BT /F1 10 Tf 0.2 0.2 0.2 rg 410 628 Td (Total Received: ) Tj ET");
  contentLines.push(`BT /F2 10 Tf 0.1 0.5 0.2 rg 490 628 Td (${summary.totalReceived.toFixed(2)} USDC) Tj ET`);

  // Table Header
  const tableTop = 580;
  contentLines.push("0.2 0.2 0.2 rg"); // Table header background
  contentLines.push(`40 ${tableTop} 532 20 re f`);

  contentLines.push(`BT /F2 9 Tf 1 1 1 rg 48 ${tableTop + 6} Td (Stream ID) Tj ET`);
  contentLines.push(`BT /F2 9 Tf 1 1 1 rg 110 ${tableTop + 6} Td (Type) Tj ET`);
  contentLines.push(`BT /F2 9 Tf 1 1 1 rg 160 ${tableTop + 6} Td (Counterparty) Tj ET`);
  contentLines.push(`BT /F2 9 Tf 1 1 1 rg 280 ${tableTop + 6} Td (Start Date) Tj ET`);
  contentLines.push(`BT /F2 9 Tf 1 1 1 rg 360 ${tableTop + 6} Td (End Date) Tj ET`);
  contentLines.push(`BT /F2 9 Tf 1 1 1 rg 440 ${tableTop + 6} Td (Amount) Tj ET`);
  contentLines.push(`BT /F2 9 Tf 1 1 1 rg 510 ${tableTop + 6} Td (Status) Tj ET`);

  // Table Rows
  let y = tableTop - 20;
  const rowHeight = 18;

  streams.slice(0, 25).forEach((s, idx) => {
    const isSent = s.sender.toLowerCase() === (walletAddress || "").toLowerCase();
    const typeLabel = isSent ? "Sent" : "Received";
    const counterparty = isSent ? s.recipient : s.sender;
    const amountVal = (
      (typeof s.deposit === "number" ? s.deposit : parseFloat(String(s.deposit)) || 0) / 10_000_000
    ).toFixed(2);
    const startDateStr = s.startTime ? s.startTime.split("T")[0] : "N/A";
    const endDateStr = s.endTime ? s.endTime.split("T")[0] : "N/A";
    const tokenSymbol = s.token || "USDC";

    // Row alternating background
    if (idx % 2 === 1) {
      contentLines.push(`0.97 0.97 0.97 rg 40 ${y} 532 ${rowHeight} re f`);
    }

    // Row border line
    contentLines.push("0.85 0.85 0.85 RG 0.5 w");
    contentLines.push(`40 ${y} 532 0.5 re f`);

    contentLines.push(`BT /F1 8 Tf 0.2 0.2 0.2 rg 48 ${y + 5} Td (#${escapePdfText(s.id)}) Tj ET`);
    contentLines.push(`BT /F2 8 Tf ${isSent ? "0.7 0.2 0.2" : "0.1 0.5 0.2"} rg 110 ${y + 5} Td (${typeLabel}) Tj ET`);
    contentLines.push(`BT /F1 8 Tf 0.2 0.2 0.2 rg 160 ${y + 5} Td (${escapePdfText(sanitizeAddr(counterparty))}) Tj ET`);
    contentLines.push(`BT /F1 8 Tf 0.3 0.3 0.3 rg 280 ${y + 5} Td (${escapePdfText(startDateStr)}) Tj ET`);
    contentLines.push(`BT /F1 8 Tf 0.3 0.3 0.3 rg 360 ${y + 5} Td (${escapePdfText(endDateStr)}) Tj ET`);
    contentLines.push(`BT /F2 8 Tf 0.1 0.1 0.1 rg 440 ${y + 5} Td (${amountVal} ${escapePdfText(tokenSymbol)}) Tj ET`);
    contentLines.push(`BT /F1 8 Tf 0.2 0.2 0.2 rg 510 ${y + 5} Td (${escapePdfText(s.status)}) Tj ET`);

    y -= rowHeight;
  });

  // Footer text
  contentLines.push("BT /F1 8 Tf 0.5 0.5 0.5 rg 40 30 Td (Sorostream Web Application - Client-Side Tax & Accounting Report - Confidential) Tj ET");

  const streamContent = contentLines.join("\n");
  const streamLength = streamContent.length;

  const pdfObjects = [
    "%PDF-1.4",
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj",
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj",
    `6 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj`,
  ];

  let xrefOffset = 0;
  const offsets: number[] = [];
  let pdfString = pdfObjects[0] + "\n";
  xrefOffset = pdfString.length;

  for (let i = 1; i < pdfObjects.length; i++) {
    offsets.push(pdfString.length);
    pdfString += pdfObjects[i] + "\n";
  }

  const startXref = pdfString.length;
  let xref = `xref\n0 ${pdfObjects.length}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    xref += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${pdfObjects.length} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`;

  return pdfString + xref;
}

/**
 * Downloads a client-side generated PDF report of all streams for a given date range and account.
 */
export function exportStreamsPdf(
  streams: StreamData[],
  account?: string | null,
  filters: ExportFilters = {},
): { filename: string; mimeType: string } {
  const summary = calculatePdfSummary(streams, account, filters);
  const label = (account || "account").replace(/[^A-Za-z0-9]/g, "").slice(0, 8) || "account";
  const filename = `${label}_${summary.startDate}_${summary.endDate}.pdf`;

  const pdfContent = generatePdfDocument(streams, account, filters);
  downloadBlob(pdfContent, filename, "application/pdf");

  return { filename, mimeType: "application/pdf" };
}
