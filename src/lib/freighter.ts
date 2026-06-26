import {
  getNetwork as freighterGetNetwork,
  WatchWalletChanges,
} from "@stellar/freighter-api";

export type { WatchWalletChanges };

/**
 * Maps the NEXT_PUBLIC_STELLAR_NETWORK env value to the network name string
 * returned by the Freighter API (case-insensitive comparison is used at call
 * sites, but we normalise here for clarity).
 *
 * Freighter returns one of: "PUBLIC", "TESTNET", "FUTURENET", "SANDBOX",
 * "STANDALONE", or a custom network name.
 */
export const APP_NETWORK = (
  process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "testnet"
).toLowerCase();

/**
 * Fetch the network the Freighter wallet is currently set to.
 * Returns `null` when Freighter is unavailable or not yet allowed.
 */
export async function getWalletNetwork(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const result = await freighterGetNetwork();
    if (result.error || !result.network) return null;
    return result.network.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Returns `true` when the wallet's active network matches the app's configured
 * network (`NEXT_PUBLIC_STELLAR_NETWORK`).  Returns `null` when the network
 * cannot be determined (Freighter not installed / not yet connected).
 */
export async function checkNetworkMatch(): Promise<boolean | null> {
  const walletNetwork = await getWalletNetwork();
  if (walletNetwork === null) return null;
  return walletNetwork === APP_NETWORK;
}

export function createWatchWalletChanges(timeout?: number) {
  return new WatchWalletChanges(timeout);
}

export async function getFreighterAdapter() {
  return {
    isConnected: async () => {
      if (typeof window === 'undefined') return false;
      return !!(window as any).freighter;
    },
    getPublicKey,
    signTransaction,
  };
}

export async function connectWallet(): Promise<string> {
  if (typeof window === 'undefined') return '';
  try {
    const freighter = (window as any).freighter;
    if (!freighter) throw new Error('Freighter not installed');
    return await freighter.getPublicKey();
  } catch (e) {
    console.error(e);
    return '';
  }
}
export async function getPublicKey(): Promise<string> {
  return connectWallet();
}
export async function signTransaction(xdr: string): Promise<string> {
  if (typeof window === 'undefined') return xdr;
  try {
    const freighter = (window as any).freighter;
    return await freighter.signTransaction(xdr);
  } catch (e) {
    console.error(e);
    return xdr;
  }
}
export async function isFreighterInstalled(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  return !!(window as any).freighter;
}
