import type { StreamHistoryEntry } from "./export";

export interface StreamData {
  id: string;
  sender: string;
  recipient: string;
  flowRate: number;
  deposit: number;
  startTime: string;
  endTime: string;
  lastWithdrawTime: string;
  status: "Active" | "Cancelled" | "Ended";
}

const MOCK_STREAMS: StreamData[] = [
  {
    id: "1", sender: "GBAM...BOEP", recipient: "GBCR...XDRL",
    flowRate: 1000000, deposit: 10000000000,
    startTime: new Date(Date.now() - 86400000 * 3).toISOString(),
    endTime: new Date(Date.now() + 86400000 * 7).toISOString(),
    lastWithdrawTime: new Date(Date.now() - 86400000).toISOString(),
    status: "Active",
  },
  {
    id: "2", sender: "GBAM...BOEP", recipient: "GDEF...XYZ",
    flowRate: 500000, deposit: 5000000000,
    startTime: new Date(Date.now() - 86400000 * 10).toISOString(),
    endTime: new Date(Date.now() + 86400000 * 5).toISOString(),
    lastWithdrawTime: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: "Active",
  },
  {
    id: "3", sender: "GHIJ...KLMN", recipient: "GBAM...BOEP",
    flowRate: 2000000, deposit: 20000000000,
    startTime: new Date(Date.now() - 86400000 * 1).toISOString(),
    endTime: new Date(Date.now() + 86400000 * 14).toISOString(),
    lastWithdrawTime: new Date(Date.now() - 86400000).toISOString(),
    status: "Active",
  },
];

export const sorostream = {
  createStream: async () => ({ streamId: "0", txHash: "" }),
  withdraw: async () => ({ txHash: "mock-tx-hash", amount: "0" }),
  cancelStream: async () => ({ txHash: "mock-tx-hash" }),
  topUp: async () => ({ txHash: "", newEndTime: new Date() }),
  getStream: async (id: string) => getMockStream(id),
  getClaimable: async (streamId: string) => claimableNow(getMockStream(streamId)),
  getStreamsBySender: async () => MOCK_STREAMS,
  getStreamsByRecipient: async () => MOCK_STREAMS,
  batchWithdraw: async (streamIds: string[]) => ({
    txHash: "mock-batch-tx-hash",
    amounts: Object.fromEntries(streamIds.map(id => [id, "0"])),
  }),
};

export function getMockStream(id: string): StreamData | null {
  return MOCK_STREAMS.find(s => s.id === id) ?? null;
}

export function getMockStreams(): StreamData[] {
  return MOCK_STREAMS;
}

export function getMockStreamHistory(id: string): StreamHistoryEntry[] {
  const base: StreamHistoryEntry[] = [
    { timestamp: new Date(Date.now() - 86400000 * 4).toISOString(), type: "creation", amount: "10000000000", txHash: "0xabc123creation" },
  ];
  if (id === "1" || id === "2" || id === "3") {
    base.push(
      { timestamp: new Date(Date.now() - 86400000 * 3).toISOString(), type: "withdrawal", amount: "2500000000", txHash: "0xdef456withdraw" },
      { timestamp: new Date(Date.now() - 86400000).toISOString(), type: "top-up", amount: "5000000000", txHash: "0xghi789topup" }
    );
  }
  return base;
}

export const createClient = () => sorostream;

/**
 * Format a stroops value as XLM/USDC with full 7-decimal precision.
 * Uses locale-aware grouping so large values are readable, e.g. "1,234.5678900".
 * Small values like 0.0001234 are preserved rather than rounding to "0.00".
 */
export function formatUSDC(stroops: bigint): string {
  return formatStellarAmount(Number(stroops));
}

/**
 * Format a raw stroop number (integer, 7-decimal fixed-point) as a
 * locale-aware string with up to 7 significant decimal places.
 *
 * Examples:
 *   1234 stroops  → "0.0001234"
 *   10000000      → "1.0000000"
 *   10000000000   → "1,000.0000000"
 */
export function formatStellarAmount(stroops: number): string {
  const whole = stroops / 10_000_000;
  return whole.toLocaleString(undefined, {
    minimumFractionDigits: 7,
    maximumFractionDigits: 7,
  });
}

export function toStroops(usdc: string): bigint {
  return BigInt(Math.round(parseFloat(usdc) * 10000000));
}

export function calculateFlowRate(stroops: bigint, durationSeconds: number): bigint {
  if (durationSeconds === 0) return BigInt(0);
  return stroops / BigInt(durationSeconds);
}

export function claimableNow(stream: any): string {
  if (!stream) return "0";

  const flowRate = Number(stream.flowRate);
  const lastWithdrawTime = new Date(stream.lastWithdrawTime).getTime();

  if (!Number.isFinite(flowRate) || !Number.isFinite(lastWithdrawTime)) {
    return "0";
  }

  const elapsedSeconds = Math.max(0, (Date.now() - lastWithdrawTime) / 1000);
  return Math.floor(flowRate * elapsedSeconds).toString();
}

export function truncateAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
