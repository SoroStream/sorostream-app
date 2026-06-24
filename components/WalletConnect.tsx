"use client";

import { useWallet } from "@/src/context/WalletContext";

interface WalletConnectProps {
  onConnect?: (publicKey: string) => void;
}

/**
 * Freighter wallet connect/disconnect button.
 * Shows a truncated public key when connected.
 * Displays a warning when the wallet's active network doesn't match the app's
 * configured network (NEXT_PUBLIC_STELLAR_NETWORK).
 */
export default function WalletConnect({ onConnect }: WalletConnectProps) {
  const {
    address,
    connect,
    disconnect,
    error,
    isConnecting,
    networkMismatch,
    expectedNetwork,
  } = useWallet();

  async function handleConnect() {
    const publicKey = await connect();
    if (publicKey) onConnect?.(publicKey);
  }

  return (
    <div>
      {/* Network mismatch warning — shown regardless of button state */}
      {networkMismatch && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-2 flex items-start gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-300"
        >
          {/* Warning icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="mt-0.5 h-4 w-4 shrink-0"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          <span>
            Your Freighter wallet is on a different network than this app
            expects (<strong className="font-semibold">{expectedNetwork}</strong>
            ). Switch networks in Freighter to avoid transaction failures.
          </span>
        </div>
      )}

      {address ? (
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-slate-300">
            {address.slice(0, 4)}...{address.slice(-4)}
          </span>
          <button
            onClick={disconnect}
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 transition-colors hover:bg-slate-800"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 disabled:opacity-50"
            aria-label="Connect Freighter wallet"
          >
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </button>
          {error && (
            <p className="mt-1 text-xs text-red-400" role="alert">
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}
