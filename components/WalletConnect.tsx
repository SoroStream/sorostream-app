"use client";

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
