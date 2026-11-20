"use client";
import { useState, useEffect, useRef } from "react";
import { useNetwork } from "@/src/lib/network";
import { useFocusTrap } from "@/src/lib/useFocusTrap";

/** Modal that asks the user to type "mainnet" before switching to mainnet. */
function MainnetConfirmModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [typed, setTyped] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(dialogRef, true, onCancel);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const matches = typed.trim().toLowerCase() === "mainnet";

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mainnet-confirm-title"
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-sm space-y-5 border border-gray-200 dark:border-gray-700">
        <div>
          <h2
            id="mainnet-confirm-title"
            className="text-lg font-semibold text-gray-900 dark:text-white mb-1"
          >
            Switch to Mainnet?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            You are switching to <span className="font-semibold text-green-400">Mainnet</span>.
            All subsequent actions — stream creation, withdrawals — will use real funds.
            Type <span className="font-mono font-semibold text-white">mainnet</span> to confirm.
          </p>
        </div>

        <div>
          <label
            htmlFor="mainnet-confirm-input"
            className="text-gray-700 dark:text-gray-200 text-sm font-medium block mb-1"
          >
            Type <span className="font-mono">mainnet</span> to confirm
          </label>
          <input
            id="mainnet-confirm-input"
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="mainnet"
            autoComplete="off"
            className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          />
          {typed.length > 0 && !matches && (
            <p className="text-red-400 text-xs mt-1">Must type exactly &ldquo;mainnet&rdquo;.</p>
          )}
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!matches}
            className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            Switch to Mainnet
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NetworkSelector() {
  const { network, setNetwork } = useNetwork();
  const [pendingMainnet, setPendingMainnet] = useState(false);
  const next = network === "testnet" ? "mainnet" : "testnet";

  function handleClick() {
    if (network === "testnet") {
      // Switching to mainnet requires typed confirmation.
      setPendingMainnet(true);
    } else {
      // Switching testnet→testnet (mainnet→testnet) is harmless: no confirmation needed.
      setNetwork("testnet");
    }
  }

  function handleConfirmMainnet() {
    setNetwork("mainnet");
    setPendingMainnet(false);
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={`text-xs px-2.5 py-1 rounded-full border transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 dark:focus-visible:ring-offset-gray-900 ${
          network === "testnet"
            ? "bg-yellow-100 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-600/50 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/60 focus-visible:ring-yellow-500"
            : "bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-600/50 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/60 focus-visible:ring-green-500"
        }`}
        aria-label={`Network: ${network}. Click to switch to ${next}`}
      >
        {network === "testnet" ? "Testnet" : "Mainnet"}
      </button>

      {pendingMainnet && (
        <MainnetConfirmModal
          onConfirm={handleConfirmMainnet}
          onCancel={() => setPendingMainnet(false)}
        />
      )}
    </>
  );
}
