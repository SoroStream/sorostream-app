"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  APP_NETWORK,
  checkNetworkMatch,
  createWatchWalletChanges,
  getFreighterAdapter,
} from "@/src/lib/freighter";

interface WalletContextValue {
  address: string | null;
  publicKey: string | null;
  isConnecting: boolean;
  error: string | null;
  /** True when Freighter's active network differs from NEXT_PUBLIC_STELLAR_NETWORK. */
  networkMismatch: boolean;
  /** The expected network name derived from NEXT_PUBLIC_STELLAR_NETWORK. */
  expectedNetwork: string;
  connect: () => Promise<string | null>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [networkMismatch, setNetworkMismatch] = useState(false);
  const watcherRef = useRef<ReturnType<typeof createWatchWalletChanges> | null>(
    null,
  );

  /** Check the wallet network and update mismatch state. */
  const verifyNetwork = useCallback(async () => {
    const matches = await checkNetworkMatch();
    // null means Freighter isn't connected/available — clear any stale warning
    setNetworkMismatch(matches === false);
  }, []);

  /** Start polling for wallet/network changes so the warning updates live. */
  const startWatcher = useCallback(() => {
    if (watcherRef.current) return; // already watching
    const watcher = createWatchWalletChanges(3000);
    watcherRef.current = watcher;
    watcher.watch(({ network }) => {
      if (!network) return;
      setNetworkMismatch(network.toLowerCase() !== APP_NETWORK);
    });
  }, []);

  const stopWatcher = useCallback(() => {
    watcherRef.current?.stop();
    watcherRef.current = null;
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const adapter = await getFreighterAdapter();
      const connected = await adapter.isConnected();

      if (!connected) {
        setError("Freighter extension not found. Please install it.");
        return null;
      }

      const publicKey = await adapter.getPublicKey();
      setAddress(publicKey || null);

      // Check network immediately after connecting, then keep watching
      await verifyNetwork();
      startWatcher();

      return publicKey || null;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      setError(message);
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, [verifyNetwork, startWatcher]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setError(null);
    setNetworkMismatch(false);
    stopWatcher();
  }, [stopWatcher]);

  // Clean up the watcher when the provider unmounts
  useEffect(() => () => stopWatcher(), [stopWatcher]);

  const value = useMemo(
    () => ({
      address,
      publicKey: address,
      isConnecting,
      error,
      networkMismatch,
      expectedNetwork: APP_NETWORK,
      connect,
      disconnect,
    }),
    [address, connect, disconnect, error, isConnecting, networkMismatch],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);

  if (!context) {
    throw new Error("useWallet must be used within WalletProvider");
  }

  return context;
}
