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
  getActiveAddress,
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

/** Polling interval (ms) used by WatchWalletChanges. */
const WATCH_INTERVAL = 2000;

/** Timeout for watch wallet changes operations. */
const WATCH_WALLET_CHANGES_TIMEOUT = 30000;

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

  const stopWatcher = useCallback(() => {
    watcherRef.current?.stop();
    watcherRef.current = null;
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setError(null);
    setNetworkMismatch(false);
    // Don't stop the watcher on disconnect — keep polling so we notice when
    // the user switches back or reconnects from within Freighter.
  }, []);

  const handleConnectionTimeout = useCallback(() => {
    setError("Connection timed out. Please check that Freighter is unlocked and try again.");
    stopWatcher();
    disconnect();
  }, [stopWatcher, disconnect]);

  /**
   * Start polling for wallet/network changes.
   * The WatchWalletChanges callback receives { publicKey, network } on every
   * poll tick — we update both address and network mismatch from it so the UI
   * stays in sync when the user switches accounts inside Freighter.
   */
  const startWatcher = useCallback(() => {
    if (watcherRef.current) return; // already watching
    const watcher = createWatchWalletChanges(WATCH_WALLET_CHANGES_TIMEOUT);
    watcherRef.current = watcher;
    watcher.watch(({ address: watchAddress, network }) => {
      // --- account change detection ---
      // Only update when address is explicitly provided; network-only ticks leave address unchanged
      if (watchAddress !== undefined) {
        setAddress((prev) => {
          if (prev !== null && prev !== watchAddress) {
            setError(null);
          }
          return watchAddress;
        });
      }

      // --- network mismatch detection ---
      if (network) {
        setNetworkMismatch(network.toLowerCase() !== APP_NETWORK);
      }
    });
  }, [handleConnectionTimeout]);

  /**
   * On mount, start the watcher unconditionally so we detect account/network
   * changes even before the user explicitly clicks "Connect".
   * If Freighter is already connected (e.g. auto-reconnect from localStorage),
   * the first tick will pick up the current address.
   */
  useEffect(() => {
    startWatcher();
    return () => stopWatcher();
  }, [startWatcher, stopWatcher]);

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

      const publicKey = await getActiveAddress();
      setAddress(publicKey || null);

      // Check network immediately after connecting; watcher keeps it live
      await verifyNetwork();
      // Watcher is already running from the mount effect; startWatcher() is
      // idempotent so calling it here is a safe no-op.
      startWatcher();

      return publicKey || null;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      // Check if it's a timeout error
      if (message.includes("timeout") || message.includes("Timeout")) {
        setError("Connection timed out. Please check that Freighter is unlocked and try again.");
      } else {
        setError(message);
      }
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, [verifyNetwork, startWatcher]);

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