import {
  SoroStreamClient,
  createFreighterAdapter,
  type Network,
  type Stream,
  formatUSDC,
  toStroops,
  calculateFlowRate,
  claimableNow,
} from "@sorostream/sdk";

export type { Stream };
export { formatUSDC, toStroops, calculateFlowRate, claimableNow };

export function truncateAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

let _client: SoroStreamClient | null = null;

export async function getClient(): Promise<SoroStreamClient> {
  if (_client) return _client;

  const network = (process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "testnet") as Network;
  const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID ?? "";
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;

  const walletAdapter = await createFreighterAdapter();

  _client = new SoroStreamClient({
    network,
    contractId,
    walletAdapter,
    ...(rpcUrl ? { rpcUrl } : {}),
  });

  return _client;
}
