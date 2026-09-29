"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useFocusTrap } from "@/src/lib/useFocusTrap";

interface WithdrawConfirmModalProps {
  /** XLM amount being withdrawn (display value, e.g. "1234.5600000") */
  amount: string;
  /**
   * Called when the user confirms. May return a promise; while the promise is
   * pending the Confirm button is disabled and shows a spinner, and a rejected
   * promise is surfaced inline so a second submission can never be triggered
   * by a rapid double-click (#543).
   */
  onConfirm: () => void | Promise<unknown>;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  // Synchronous guard: `disabled` is only applied on the next render, so two
  // clicks dispatched in the same tick would both pass the state check.
  const submittingRef = useRef(false);

  useFocusTrap(dialogRef, true);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const matches = typed === amount;
  const confirmDisabled = !matches || isSubmitting;

  const handleConfirm = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setError("");

    try {
      await onConfirm();
    } catch {
      // Surface the failure inline instead of silently re-enabling the button.
      setError("Withdrawal failed. Please check your wallet and try again.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [onConfirm]);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="withdraw-confirm-title"
      aria-busy={isSubmitting || undefined}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-sm space-y-5 border border-gray-200 dark:border-gray-700">
        <div>
          <h2
            id="withdraw-confirm-title"
            className="text-lg font-semibold text-gray-900 dark:text-white mb-1"
          >
            Confirm large withdrawal
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            You are about to withdraw{" "}
            <span className="text-gray-900 dark:text-white font-mono font-semibold">{amount} XLM</span>.
            Type the amount below to confirm.
          </p>
        </div>

        <div>
          <label
            htmlFor="withdraw-confirm-input"
            className="text-gray-700 dark:text-gray-200 text-sm font-medium block mb-1"
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
            disabled={isSubmitting}
            className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:opacity-60"
            aria-describedby="withdraw-confirm-hint"
          />
          {!isSubmitting && typed.length > 0 && !matches && (
            <p id="withdraw-confirm-hint" className="text-red-400 text-xs mt-1">
              Amount doesn&apos;t match.
            </p>
          )}
        </div>

        {error && (
          <p
            role="alert"
            data-testid="withdraw-confirm-error"
            className="text-red-400 text-xs"
          >
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 dark:focus-visible:ring-offset-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirmDisabled}
            aria-busy={isSubmitting || undefined}
            className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 dark:focus-visible:ring-offset-gray-900 inline-flex items-center justify-center gap-2"
          >
            {isSubmitting && (
              <svg
                data-testid="withdraw-confirm-spinner"
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            )}
            {isSubmitting ? "Submitting…" : "Confirm Withdrawal"}
          </button>
        </div>
      </div>
    </div>
  );
}
