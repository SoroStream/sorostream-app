"use client";

import { useState, useEffect, useRef } from "react";

interface WithdrawConfirmModalProps {
  /** XLM amount being withdrawn (display value, e.g. "1234.5600000") */
  amount: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Large-withdrawal confirmation modal.
 * The user must type the exact displayed amount before the Confirm button is enabled.
 */
export default function WithdrawConfirmModal({
  amount,
  onConfirm,
  onCancel,
}: WithdrawConfirmModalProps) {
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input on mount for keyboard-first UX
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const matches = typed === amount;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="withdraw-confirm-title"
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-sm space-y-5">
        <div>
          <h2
            id="withdraw-confirm-title"
            className="text-lg font-semibold text-white mb-1"
          >
            Confirm large withdrawal
          </h2>
          <p className="text-gray-400 text-sm">
            You are about to withdraw{" "}
            <span className="text-white font-mono font-semibold">{amount} XLM</span>.
            Type the amount below to confirm.
          </p>
        </div>

        <div>
          <label
            htmlFor="withdraw-confirm-input"
            className="text-gray-200 text-sm font-medium block mb-1"
          >
            Type <span className="font-mono">{amount}</span> to confirm
          </label>
          <input
            id="withdraw-confirm-input"
            ref={inputRef}
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={amount}
            autoComplete="off"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            aria-describedby="withdraw-confirm-hint"
          />
          {typed.length > 0 && !matches && (
            <p id="withdraw-confirm-hint" className="text-red-400 text-xs mt-1">
              Amount doesn&apos;t match.
            </p>
          )}
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 border border-gray-600 text-gray-300 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!matches}
            className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            Confirm Withdrawal
          </button>
        </div>
      </div>
    </div>
  );
}
