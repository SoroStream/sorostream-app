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
  getClaimable: async () => "0",
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

export const createClient = () => sorostream;

export function formatUSDC(stroops: bigint): string {
  return (Number(stroops) / 10000000).toFixed(2);
}

export function toStroops(usdc: string): bigint {
  return BigInt(Math.round(parseFloat(usdc) * 10000000));
}

export function calculateFlowRate(stroops: bigint, durationSeconds: number): bigint {
  if (durationSeconds === 0) return BigInt(0);
  return stroops / BigInt(durationSeconds);
}

export function claimableNow(stream: any): string {
  return "0";
}

export function truncateAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
