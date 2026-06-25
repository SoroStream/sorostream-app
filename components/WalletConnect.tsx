"use client";

import { useWallet } from "@/src/context/WalletContext";
import { useState } from "react";
import {
  WalletType,
  WalletAdapter,
  WALLET_LABELS,
  freighterAdapter,
  ledgerAdapter,
  ServerKeypairAdapter,
} from "@/src/lib/wallets";
import { useTranslations } from "@/src/lib/i18n";

interface WalletConnectProps {
  onConnect?: (publicKey: string, walletType: WalletType) => void;
}

const WALLET_TYPES: WalletType[] = ["freighter", "ledger", "server-keypair"];

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
 * Multi-wallet connect button.
 * Supports Freighter, Ledger, and Server Keypair adapters.
 */
export default function WalletConnect({ onConnect }: WalletConnectProps) {
  const t = useTranslations("wallet");
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<WalletType>("freighter");
  const [secretInput, setSecretInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adapter, setAdapter] = useState<WalletAdapter | null>(null);

  async function handleConnect() {
    setLoading(true);
    setError(null);
    try {
      let selected: WalletAdapter;
      if (walletType === "freighter") selected = freighterAdapter;
      else if (walletType === "ledger") selected = ledgerAdapter;
      else selected = new ServerKeypairAdapter(secretInput);

      const available = await selected.isAvailable();
      if (!available) {
        setError(
          walletType === "freighter"
            ? t("error_freighter")
            : walletType === "ledger"
            ? t("error_ledger")
            : t("error_server_keypair")
        );
        return;
      }

      const key = await selected.getPublicKey();
      setPublicKey(key);
      setAdapter(selected);
      onConnect?.(key, walletType);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
      trackEvent({ type: 'wallet_connect', success: false });
    } finally {
      setLoading(false);
    }
  }

  function handleDisconnect() {
    adapter?.disconnect();
    setPublicKey(null);
    setAdapter(null);
    setSecretInput("");
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
          {t("disconnect")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {WALLET_TYPES.map((w) => (
          <button
            key={w}
            onClick={() => setWalletType(w)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
              walletType === w
                ? "bg-sky-600 text-white border-sky-600"
                : "border-slate-300 text-slate-600 hover:bg-slate-100"
            }`}
          >
            {WALLET_LABELS[w]}
          </button>
        ))}
      </div>

      {walletType === "server-keypair" && (
        <input
          type="password"
          placeholder={t("secret_placeholder")}
          value={secretInput}
          onChange={(e) => setSecretInput(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          aria-label="Server keypair secret key"
        />
      )}

      <button
        onClick={handleConnect}
        disabled={loading}
        className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50 transition-colors"
        aria-label={`Connect ${WALLET_LABELS[walletType]} wallet`}
      >
        {loading ? t("connecting") : t("connect", { wallet: WALLET_LABELS[walletType] })}
      </button>

      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
