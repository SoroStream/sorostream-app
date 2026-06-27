"use client";

import { useState, useCallback } from "react";
import LiveCounter from "@/components/LiveCounter";
import { sorostream, claimableNow, getMockStream } from "@/src/lib/sorostream";
import { useToast } from "@/src/lib/toast";

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
  const { addToast } = useToast();

  /**
   * optimisticClaimable:
   *   null  → normal live-ticking mode
   *   0     → after optimistic withdraw (shows 0, pending tx confirmation)
   */
  const [optimisticClaimable, setOptimisticClaimable] = useState<
    number | null
  >(null);

  const handleWithdraw = useCallback(async () => {
    // Snapshot the current claimable amount so we can roll back if needed
    const stream = getMockStream(streamId);
    const previousClaimable = stream
      ? Number(claimableNow(stream))
      : null;

    // --- Optimistic update: show 0 immediately ---
    setOptimisticClaimable(0);
    setWithdrawing(true);

    try {
      const result = await sorostream.withdraw();
      // Transaction confirmed — clear optimistic state and resume live tick
      setOptimisticClaimable(null);
      addToast(
        `Withdrawn ${result.amount} USDC from stream #${streamId}`,
        "success"
      );
    } catch {
      // --- Rollback: restore previous value and resume ticking ---
      setOptimisticClaimable(null);
      if (previousClaimable !== null) {
        // Let LiveCounter reconcile from on-chain; we just surface the error
      }
      addToast("Withdrawal failed. Please try again.", "error");
    } finally {
      setWithdrawing(false);
    }
  }, [streamId, addToast]);

  const handleCancel = useCallback(async () => {
    setCancelling(true);
    try {
      await sorostream.cancelStream();
      addToast(`Stream #${streamId} cancelled`, "success");
    } catch {
      addToast("Failed to cancel stream. Please try again.", "error");
    } finally {
      setCancelling(false);
    }
  }, [streamId, addToast]);

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
          onClick={handleCancel}
          disabled={cancelling}
          aria-busy={cancelling}
          className="flex-1 border border-red-600 text-red-400 py-3 rounded-lg font-medium hover:bg-red-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          disabled={cancelling || withdrawing}
          className="flex-1 border border-red-600 text-red-400 py-3 rounded-lg font-medium hover:bg-red-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {cancelling ? (
            <>
              <Spinner />
              Cancelling…
            </>
          ) : (
            "Cancel"
          )}
        </button>
      </div>
    </>
  );
}
