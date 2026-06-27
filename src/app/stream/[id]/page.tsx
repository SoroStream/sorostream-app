"use client";

import { useEffect, useState } from "react";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import LiveCounter from "@/components/LiveCounter";
import { StreamListSkeleton } from "@/components/Skeleton";
import { downloadCSV, downloadJSON, StreamHistoryEntry } from "@/src/lib/export";
import {
  sorostream,
  StreamData,
  getMockStreamHistory,
  claimableNow,
  getMockStream,
  toStroops,
} from "@/src/lib/sorostream";
import { useToast } from "@/src/lib/toast";

type ActionLoading = "top-up" | "withdraw" | "cancel" | null;

/** Spinner used inside transaction buttons */
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

export default function StreamDetail({ params }: { params: { id: string } }) {
  const { addToast } = useToast();

  const [stream, setStream] = useState<StreamData | null>(null);
  const [historyEntries, setHistoryEntries] = useState<StreamHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<ActionLoading>(null);
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [historyEntries, setHistoryEntries] = useState<StreamHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  // --- Top-up form state ---
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpLoading, setTopUpLoading] = useState(false);

  // --- Withdraw / cancel state ---
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  /**
   * Optimistic states:
   *
   * optimisticClaimable — passed to LiveCounter:
   *   null  → live ticking
   *   0     → immediately after withdraw click (pending tx)
   *
   * optimisticDeposit — shown next to stream balance:
   *   null  → use stream.deposit
   *   n     → optimistic value while top-up tx is in-flight
   */
  const [optimisticClaimable, setOptimisticClaimable] = useState<number | null>(null);
  const [optimisticDeposit, setOptimisticDeposit] = useState<number | null>(null);

  // -----------------------------------------------------------------------
  // Load stream on mount
  // -----------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function loadStream() {
      setLoading(true);
      setError(null);
      try {
        const data = await sorostream.getStream(params.id);
        if (cancelled) return;
        setStream(data);
        setHistoryEntries(data ? getMockStreamHistory(params.id) : []);
      } catch (err) {
        console.error("Failed to load stream", err);
        if (!cancelled) setError("Failed to load stream data.");
      } finally {
        setPageLoading(false);
      }
    }

    void loadStream();

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  // -----------------------------------------------------------------------
  // Withdraw with optimistic update
  // -----------------------------------------------------------------------
  const handleWithdraw = useCallback(async () => {
    // Snapshot pre-tx state for rollback
    const prevStream = getMockStream(params.id);
    const prevClaimable = prevStream ? Number(claimableNow(prevStream)) : 0;

    // Optimistic: zero out the counter immediately
    setOptimisticClaimable(0);
    setWithdrawLoading(true);

    try {
      const result = await sorostream.withdraw();
      // Confirmed — clear optimistic override, LiveCounter resumes ticking
      setOptimisticClaimable(null);
      addToast(`Withdrawal submitted! Tx: ${result.txHash}`, "success");
    } catch {
      // Rollback — restore previous value and let LiveCounter rehydrate
      setOptimisticClaimable(null);
      // prevClaimable is informational; LiveCounter will reconcile via interval
      void prevClaimable;
      addToast("Withdrawal failed. Please try again.", "error");
    } finally {
      setWithdrawLoading(false);
    }
  }, [params.id, addToast]);

  // -----------------------------------------------------------------------
  // Top-up with optimistic update
  // -----------------------------------------------------------------------
  const handleTopUp = useCallback(async () => {
    const parsedAmount = parseFloat(topUpAmount);
    if (!topUpAmount || parsedAmount <= 0) return;

    if (!stream) return;

    // Snapshot pre-tx stream state for rollback
    const prevDeposit = stream.deposit;
    const addedStroops = Number(toStroops(topUpAmount));

    // Optimistic: increment deposit immediately
    const optimisticNewDeposit = prevDeposit + addedStroops;
    setOptimisticDeposit(optimisticNewDeposit);
    setTopUpLoading(true);

    try {
      await sorostream.topUp();
      // Fetch confirmed state from chain
      const updated = await sorostream.getStream(params.id);
      setStream(updated);
      // Clear optimistic override — confirmed value now in `stream`
      setOptimisticDeposit(null);
      setShowTopUp(false);
      setTopUpAmount("");
      addToast("Top-up successful!", "success");
    } catch {
      // Rollback: revert to pre-tx deposit
      setOptimisticDeposit(null);
      void prevDeposit;
      addToast("Top-up failed. Please try again.", "error");
    } finally {
      setTopUpLoading(false);
    }
  }, [topUpAmount, stream, params.id, addToast]);

  // -----------------------------------------------------------------------
  // Cancel stream
  // -----------------------------------------------------------------------
  const handleCancelConfirmed = useCallback(async () => {
    setShowCancelModal(false);
    setCancelLoading(true);
    try {
      const result = await sorostream.cancelStream();
      addToast(`Stream cancelled. Tx: ${result.txHash}`, "success");
    } catch {
      addToast("Cancellation failed. Please try again.", "error");
    } finally {
      setActionLoading(null);
    }
  }, [addToast]);

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------
  const formatUSDC = (stroops: number) => (stroops / 10_000_000).toFixed(2);

  const displayDeposit =
    optimisticDeposit != null ? optimisticDeposit : stream?.deposit ?? 0;
  const isDepositOptimistic = optimisticDeposit != null;

  if (pageLoading) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-4">
            <Link
              href="/dashboard"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              ← Dashboard
            </Link>
          </div>
          <h1 className="text-2xl font-bold mb-8">Stream #{params.id}</h1>
          {/*
            StreamListSkeleton used here to show a consistent placeholder while
            stream data is being fetched — mirrors the row structure from the
            dashboard so the transition feels familiar
          */}
          <StreamListSkeleton rows={1} />
        </div>
      </main>
    );
  }

  if (!stream) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-4">
            <Link
              href="/dashboard"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              ← Dashboard
            </Link>
          </div>
          <h1 className="text-2xl font-bold mb-8">Stream #{params.id}</h1>
          <p className="text-red-400">{error ?? "Stream not found."}</p>
        </div>
      </main>
    );
  }

  const isBusy = actionLoading !== null;

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="mb-4">
          <Link
            href="/dashboard"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            ← Dashboard
          </Link>
        </div>

        <h1 className="text-2xl font-bold mb-2">Stream #{stream.id}</h1>
        <div className="flex flex-col sm:flex-row sm:gap-4 text-sm text-gray-400 mb-8">
          <span>
            From: <span className="text-white font-mono">{stream.sender}</span>
          </span>
          <span className="hidden sm:inline">|</span>
          <span>
            To:{" "}
            <span className="text-white font-mono">{stream.recipient}</span>
          </span>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 space-y-6">
          <StreamTimeline
            startTime={stream.startTime}
            endTime={stream.endTime}
          />

          {/* Claimable balance — optimistic withdraw support */}
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">Claimable now</p>
            <div className="text-2xl sm:text-3xl font-bold">
              <LiveCounter
                streamId={stream.id}
                flowRate={stream.flowRate}
                lastWithdrawTime={new Date(stream.lastWithdrawTime)}
                optimisticOverride={optimisticClaimable}
              />
            </div>
          </StreamErrorBoundary>

          {/* Stream deposit — optimistic top-up support */}
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-1">Stream balance (deposit)</p>
            <p
              className={`font-mono font-semibold text-lg ${
                isDepositOptimistic ? "text-yellow-400" : "text-white"
              }`}
            >
              {formatUSDC(displayDeposit)} USDC
              {isDepositOptimistic && (
                <span className="ml-2 text-xs font-normal text-yellow-400/80 italic">
                  (pending…)
                </span>
              )}
            </p>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          {/* Withdraw / Cancel */}
          <div className="flex gap-4">
            <button
              onClick={handleWithdraw}
              disabled={withdrawLoading || cancelLoading}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {withdrawLoading ? (
                <>
                  <Spinner />
                  Withdrawing…
                </>
              ) : (
                "Withdraw"
              )}
            </button>

            <button
              onClick={() => setShowCancelModal(true)}
              disabled={cancelLoading || withdrawLoading}
              className="flex-1 border border-red-600 text-red-400 py-3 rounded-lg font-medium hover:bg-red-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {cancelLoading ? (
                <>
                  <Spinner />
                  Cancelling…
                </>
              ) : (
                "Cancel"
              )}
            </button>
          </div>

          {/* Top-up form */}
          {showTopUp && (
            <div className="space-y-2">
              <input
                type="number"
                value={topUpAmount}
                onChange={(event) => setTopUpAmount(event.target.value)}
                placeholder="Amount (USDC)"
                min="0"
                step="0.01"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm"
              />
              <button
                onClick={handleTopUp}
                disabled={topUpLoading || !topUpAmount || parseFloat(topUpAmount) <= 0}
                className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {topUpLoading ? (
                  <>
                    <Spinner />
                    Topping up…
                  </>
                ) : (
                  "Confirm Top-up"
                )}
              </button>
            </div>
          )}
          <button
            onClick={() => setShowTopUp((v) => !v)}
            disabled={topUpLoading}
            className="w-full border border-gray-600 text-gray-300 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {showTopUp ? "Cancel Top-up" : "Top Up Stream"}
          </button>

          {/* History */}
          <section aria-labelledby="history-heading">
            <h2 id="history-heading" className="text-lg font-semibold mb-3">
              Transaction History
            </h2>
            <StreamHistory entries={historyEntries} />
            <div className="mt-4">
              <p className="text-gray-400 text-sm font-medium mb-3">
                History Export
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => downloadCSV(historyEntries, params.id)}
                  className="flex-1 bg-gray-700 text-white py-2 rounded-lg text-sm hover:bg-gray-600 transition-colors"
                >
                  Download CSV
                </button>
                <button
                  onClick={() => downloadJSON(historyEntries, params.id)}
                  className="flex-1 bg-gray-700 text-white py-2 rounded-lg text-sm hover:bg-gray-600 transition-colors"
                >
                  Download JSON
                </button>
              </div>
            </section>
          </StreamErrorBoundary>
        </div>
      </div>

      {/* Cancel confirmation modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h2 className="text-lg font-semibold text-white">Cancel Stream?</h2>
            <p className="text-gray-400 text-sm">
              This is irreversible. Any unstreamed funds will be returned to the
              sender.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 border border-gray-600 text-gray-300 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={handleCancelConfirmed}
                disabled={cancelLoading}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {cancelLoading ? (
                  <>
                    <Spinner />
                    Cancelling…
                  </>
                ) : (
                  "Yes, Cancel"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
