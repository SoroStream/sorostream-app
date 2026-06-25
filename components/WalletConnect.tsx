"use client";

import { useState } from "react";
import { getFreighterAdapter } from "@/src/lib/freighter";
import { trackEvent } from "@/src/lib/analytics";

interface WalletConnectProps {
  onConnect?: (publicKey: string) => void;
}

/**
 * Freighter wallet connect/disconnect button.
 * Shows a truncated public key when connected.
 */
export default function WalletConnect({ onConnect }: WalletConnectProps) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setLoading(true);
    setError(null);
    try {
      const adapter = await getFreighterAdapter();
      const connected = await adapter.isConnected();
      if (!connected) {
        setError("Freighter extension not found. Please install it.");
        trackEvent({ type: 'wallet_connect', success: false });
        return;
      }
      const key = await adapter.getPublicKey();
      setPublicKey(key);
      onConnect?.(key);
      trackEvent({ type: 'wallet_connect', success: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
      trackEvent({ type: 'wallet_connect', success: false });
    } finally {
      setLoading(false);
    }
  }

  function handleDisconnect() {
    setPublicKey(null);
  }

  if (publicKey) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-600 font-mono" aria-label={`Connected wallet: ${publicKey}`}>
          {publicKey.slice(0, 4)}…{publicKey.slice(-4)}
        </span>
        <button
          onClick={handleDisconnect}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Disconnect wallet"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleConnect}
        disabled={loading}
        className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50 transition-colors"
        aria-label="Connect Freighter wallet"
      >
        {loading ? "Connecting…" : "Connect Wallet"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>}
    </div>
  );
}
