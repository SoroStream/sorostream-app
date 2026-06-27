"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import LiveCounter from "@/components/LiveCounter";
import { sorostream, claimableNow, getMockStream } from "@/src/lib/sorostream";
import { useToast } from "@/src/lib/toast";

/** Grace period in seconds before a cancel is submitted on-chain. */
const CANCEL_GRACE_SECONDS = 5;

interface StreamActionsProps {
  streamId: string;
  flowRate: number;
  lastWithdrawTime: string;
}

/** Thin spinner SVG rendered inside the button while a tx is pending */
function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 inline-block mr-1.5 align-middle"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

export default function StreamActions({
  streamId,
  flowRate,
  lastWithdrawTime,
}: StreamActionsProps) {
  const [withdrawing, setWithdrawing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  /** True while the 5-second grace period countdown is running. */
  const [cancelPending, setCancelPending] = useState(false);
  const { addToast, upsertPersistentToast, removeToast } = useToast();

  /**
   * optimisticClaimable:
   *   null  → normal live-ticking mode
   *   0     → after optimistic withdraw (shows 0, pending tx confirmation)
   */
  const [optimisticClaimable, setOptimisticClaimable] = useState<number | null>(null);

  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelToastIdRef = useRef<number | null>(null);
  /** Set to true when the user clicks Undo — prevents the timeout from firing. */
  const undoRef = useRef(false);

  /** Clean up timers on unmount so we don't fire stale callbacks. */
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (submitTimeoutRef.current) clearTimeout(submitTimeoutRef.current);
    };
  }, []);

  const handleWithdraw = useCallback(async () => {
    const stream = getMockStream(streamId);
    const previousClaimable = stream ? Number(claimableNow(stream)) : null;

    setOptimisticClaimable(0);
    setWithdrawing(true);

    try {
      const result = await sorostream.withdraw();
      setOptimisticClaimable(null);
      addToast(`Withdrawn ${result.amount} USDC from stream #${streamId}`, "success");
    } catch {
      setOptimisticClaimable(null);
      void previousClaimable;
      addToast("Withdrawal failed. Please try again.", "error");
    } finally {
      setWithdrawing(false);
    }
  }, [streamId, addToast]);

  /**
   * Aborts the pending cancellation. Safe to call multiple times.
   */
  const handleUndo = useCallback(() => {
    undoRef.current = true;

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (submitTimeoutRef.current) {
      clearTimeout(submitTimeoutRef.current);
      submitTimeoutRef.current = null;
    }
    if (cancelToastIdRef.current !== null) {
      removeToast(cancelToastIdRef.current);
      cancelToastIdRef.current = null;
    }

    setCancelPending(false);
    addToast("Cancellation undone.", "info");
  }, [removeToast, addToast]);

  /**
   * Submits the cancel transaction after the grace period elapses.
   * Only called when the user has not clicked Undo.
   */
  const submitCancel = useCallback(async () => {
    setCancelPending(false);
    setCancelling(true);

    if (cancelToastIdRef.current !== null) {
      removeToast(cancelToastIdRef.current);
      cancelToastIdRef.current = null;
    }

    try {
      await sorostream.cancelStream();
      addToast(`Stream #${streamId} cancelled`, "success");
    } catch {
      addToast("Failed to cancel stream. Please try again.", "error");
    } finally {
      setCancelling(false);
    }
  }, [streamId, addToast, removeToast]);

  /**
   * Starts the 5-second grace period.
   * Shows a persistent countdown toast with an inline Undo button.
   * After 5 seconds, submits the on-chain transaction.
   */
  const handleCancel = useCallback(() => {
    if (cancelPending || cancelling) return;

    undoRef.current = false;
    setCancelPending(true);

    let secondsLeft = CANCEL_GRACE_SECONDS;

    const toastKey = `cancel-grace-${streamId}`;

    const showCountdown = (secs: number) => {
      const toastId = upsertPersistentToast(
        toastKey,
        `Cancelling stream #${streamId} in ${secs}s…`,
        "warning",
        { label: "Undo", onClick: handleUndo },
      );
      cancelToastIdRef.current = toastId;
    };

    showCountdown(secondsLeft);

    countdownIntervalRef.current = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft > 0) {
        showCountdown(secondsLeft);
      } else {
        clearInterval(countdownIntervalRef.current!);
        countdownIntervalRef.current = null;
      }
    }, 1000);

    submitTimeoutRef.current = setTimeout(() => {
      if (!undoRef.current) {
        void submitCancel();
      }
    }, CANCEL_GRACE_SECONDS * 1000);
  }, [cancelPending, cancelling, streamId, upsertPersistentToast, handleUndo, submitCancel]);

  return (
    <>
      <div className="text-center">
        <p className="text-gray-400 text-sm mb-2">Claimable now</p>
        <div className="text-3xl font-bold">
          <LiveCounter
            streamId={streamId}
            flowRate={flowRate}
            lastWithdrawTime={new Date(lastWithdrawTime)}
            optimisticOverride={optimisticClaimable}
          />
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleWithdraw}
          disabled={withdrawing || cancelling || cancelPending}
          disabled={withdrawing}
          aria-busy={withdrawing}
          className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          disabled={withdrawing || cancelling}
          className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {withdrawing ? (
            <>
              <Spinner />
              Withdrawing…
            </>
          ) : (
            "Withdraw"
          )}
        </button>

        <button
          onClick={cancelPending ? handleUndo : handleCancel}
          onClick={handleCancel}
          disabled={cancelling}
          aria-busy={cancelling}
          className="flex-1 border border-red-600 text-red-400 py-3 rounded-lg font-medium hover:bg-red-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          disabled={cancelling || withdrawing}
          className={`flex-1 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            cancelPending
              ? "bg-amber-600 text-white hover:bg-amber-700"
              : "border border-red-600 text-red-400 hover:bg-red-900"
          }`}
          aria-live="polite"
        >
          {cancelling ? (
            <>
              <Spinner />
              Cancelling…
            </>
          ) : cancelPending ? (
            "Undo Cancel"
          ) : (
            "Cancel"
          )}
        </button>
      </div>
    </>
  );
}
