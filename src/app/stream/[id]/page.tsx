"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import LiveCounter from "@/components/LiveCounter";
import FiatDisplay from "@/components/FiatDisplay";
import FederationName from "@/components/FederationName";
import StreamTimeline from "@/components/StreamTimeline";
import StreamHistory from "@/components/StreamHistory";
import { StreamErrorBoundary } from "@/components/StreamErrorBoundary";
import { StreamListSkeleton } from "@/components/Skeleton";
import { downloadCSV, downloadJSON, type StreamHistoryEntry } from "@/src/lib/export";
import {
  sorostream,
  type StreamData,
  getMockStreamHistory,
  claimableNow,
  getMockStream,
  toStroops,
} from "@/src/lib/sorostream";
import { useToast } from "@/src/lib/toast";
import StreamQrModal from "@/components/StreamQrModal";

/** Grace period in seconds before a cancel is submitted on-chain. */
const CANCEL_GRACE_SECONDS = 5;

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
  const { addToast, upsertPersistentToast, removeToast } = useToast();

  // ── Stream data ────────────────────────────────────────────────────────────
  const [stream, setStream] = useState<StreamData | null>(null);
  const [historyEntries, setHistoryEntries] = useState<StreamHistoryEntry[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Action loading states ──────────────────────────────────────────────────
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  /** True while the 5-second cancel grace period is active. */
  const [cancelPending, setCancelPending] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // ── Top-up form state ──────────────────────────────────────────────────────
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpLoading, setTopUpLoading] = useState(false);

  // ── Optimistic UI state ────────────────────────────────────────────────────
  /**
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

  // ── Grace-period timer refs ────────────────────────────────────────────────
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelToastIdRef = useRef<number | null>(null);
  const undoRef = useRef(false);

  /** Clean up timers on unmount. */
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (submitTimeoutRef.current) clearTimeout(submitTimeoutRef.current);
    };
  }, []);

  // ── Load stream on mount ───────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadStream() {
      setPageLoading(true);
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
        if (!cancelled) setPageLoading(false);
      }
    }

    void loadStream();

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  // ── Withdraw with optimistic update ───────────────────────────────────────
  const handleWithdraw = useCallback(async () => {
    const prevStream = getMockStream(params.id);
    const prevClaimable = prevStream ? Number(claimableNow(prevStream)) : 0;

    setOptimisticClaimable(0);
    setWithdrawLoading(true);

    try {
      const result = await sorostream.withdraw();
      setOptimisticClaimable(null);
      addToast(`Withdrawal submitted! Tx: ${result.txHash}`, "success");
    } catch {
      setOptimisticClaimable(null);
      void prevClaimable;
      addToast("Withdrawal failed. Please try again.", "error");
    } finally {
      setWithdrawLoading(false);
    }
  }, [params.id, addToast]);

  // ── Top-up with optimistic update ─────────────────────────────────────────
  const handleTopUp = useCallback(async () => {
    const parsedAmount = parseFloat(topUpAmount);
    if (!topUpAmount || parsedAmount <= 0) return;
    if (!stream) return;

    const prevDeposit = stream.deposit;
    const addedStroops = Number(toStroops(topUpAmount));
    setOptimisticDeposit(prevDeposit + addedStroops);
    setTopUpLoading(true);

  async function handleWithdraw() {
    setWithdrawLoading(true);
    setTxStatus(null);
    setError(null);
    try {
      const result = await sorostream.withdraw();
      setTxStatus(`Withdrawal submitted! Tx: ${result.txHash}`);
      const result = await rpcFetch(() => sorostream.withdraw());
      setTxStatus(`Withdrawal submitted! Tx: ${result.txHash}`);
    try {
      await sorostream.topUp();
      const updated = await sorostream.getStream(params.id);
      setStream(updated);
      setOptimisticDeposit(null);
      setShowTopUp(false);
      setTopUpAmount("");
      addToast("Top-up successful!", "success");
    } catch {
      setOptimisticDeposit(null);
      void prevDeposit;
      addToast("Top-up failed. Please try again.", "error");
    } finally {
      setTopUpLoading(false);
    }
  }, [topUpAmount, stream, params.id, addToast]);

  // ── Cancel: submit the actual transaction ──────────────────────────────────
  const submitCancel = useCallback(async () => {
    setCancelPending(false);
    setCancelLoading(true);

    if (cancelToastIdRef.current !== null) {
      removeToast(cancelToastIdRef.current);
      cancelToastIdRef.current = null;
    }

    try {
      const result = await sorostream.cancelStream();
      addToast(`Stream cancelled. Tx: ${result.txHash}`, "success");
    } catch {
      addToast("Cancellation failed. Please try again.", "error");
    } finally {
      setCancelLoading(false);
    }
  }, [addToast, removeToast]);

  // ── Cancel: undo during grace period ──────────────────────────────────────
  const handleCancelUndo = useCallback(() => {
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

  // ── Cancel: start the 5-second grace period ────────────────────────────────
  const handleCancelConfirmed = useCallback(() => {
    setShowCancelModal(false);
    if (cancelPending || cancelLoading) return;

    undoRef.current = false;
    setCancelPending(true);

    let secondsLeft = CANCEL_GRACE_SECONDS;
    const toastKey = `cancel-grace-${params.id}`;

    const showCountdown = (secs: number) => {
      const toastId = upsertPersistentToast(
        toastKey,
        `Cancelling stream #${params.id} in ${secs}s…`,
        "warning",
        { label: "Undo", onClick: handleCancelUndo },
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
  }, [cancelPending, cancelLoading, params.id, upsertPersistentToast, handleCancelUndo, submitCancel]);

  // ── Render helpers ─────────────────────────────────────────────────────────
  const formatUSDC = (stroops: number) => (stroops / 10_000_000).toFixed(2);
  const displayDeposit = optimisticDeposit != null ? optimisticDeposit : stream?.deposit ?? 0;
  const isDepositOptimistic = optimisticDeposit != null;

  // ── Render: loading ────────────────────────────────────────────────────────
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
          <StreamListSkeleton rows={1} />
        </div>
      </main>
    );
  }

  // ── Render: not found ──────────────────────────────────────────────────────
  if (!stream) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-4">
            <Link
              href="/dashboard"
              className="text-sm text-gray-300 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 rounded"
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

  const toXlm = (stroops: number) => (stroops / 10_000_000).toFixed(2);
  const depositXlm = stream.deposit / 10_000_000;
  const flowXlm = stream.flowRate / 10_000_000;
  const isBusy = withdrawLoading || cancelLoading || cancelPending || topUpLoading;

  // ── Render: detail ─────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="mb-4">
          <Link
            href="/dashboard"
            className="text-sm text-gray-300 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 rounded"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            ← Dashboard
          </Link>
        </div>

        <h1 className="text-2xl font-bold mb-2">Stream #{stream.id}</h1>
        <div className="flex flex-col sm:flex-row sm:gap-4 text-sm text-gray-400 mb-8">
          <span>
            From:{" "}
            <span className="text-white">
              <FederationName address={stream.sender} truncate />
            </span>
          </span>
          <span className="hidden sm:inline" aria-hidden="true">|</span>
          <span>
            To:{" "}
            <span className="text-white">
              <FederationName address={stream.recipient} truncate />
            </span>
          </span>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 space-y-6">
          <StreamTimeline startTime={stream.startTime} endTime={stream.endTime} />

          {/* Deposit & flow rate */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400 mb-1">Total deposit</p>
              <p className="text-white font-mono">
                {toXlm(stream.deposit)} XLM
                <FiatDisplay xlmAmount={depositXlm} />
              </p>
            </div>
            <div>
              <p className="text-gray-400 mb-1">Flow rate</p>
              <p className="text-green-400 font-mono">
                {toXlm(stream.flowRate)} XLM/sec
                <FiatDisplay xlmAmount={flowXlm} />
              </p>
            </div>
          </div>

          {/* Claimable balance — optimistic withdraw support */}
          <StreamErrorBoundary section="Live Counter" resetKey={stream.id}>
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
            </div>
          </StreamErrorBoundary>

          {/* Stream balance — optimistic top-up support */}
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-1">Stream balance (deposit)</p>
            <p
              role="status"
              className={`text-sm text-center ${
                txStatus.toLowerCase().includes("fail") ? "text-red-400" : "text-green-400"
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

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          {error && (
            <p role="alert" className="text-red-400 text-sm text-center">
              {error}
            </p>
          )}

          {/* Primary actions */}
          <div className="flex gap-4">
            <button
              onClick={handleWithdraw}
              disabled={withdrawLoading}
              aria-busy={withdrawLoading}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          {/* Withdraw / Cancel */}
          <div className="flex gap-4">
            <button
              onClick={handleWithdraw}
              disabled={isBusy}
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
              onClick={cancelPending ? handleCancelUndo : () => setShowCancelModal(true)}
              disabled={cancelLoading || withdrawLoading || topUpLoading}
              className={`flex-1 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                cancelPending
                  ? "bg-amber-600 text-white hover:bg-amber-700"
                  : "border border-red-600 text-red-400 hover:bg-red-900"
              }`}
              aria-live="polite"
              onClick={() => setShowCancelModal(true)}
              disabled={cancelLoading}
              aria-busy={cancelLoading}
              className="flex-1 border border-red-600 text-red-400 py-3 rounded-lg font-medium hover:bg-red-900 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              disabled={cancelLoading || withdrawLoading}
              className="flex-1 border border-red-600 text-red-400 py-3 rounded-lg font-medium hover:bg-red-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {cancelLoading ? (
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

          <button
            onClick={() => setShowQrModal(true)}
            className="w-full border border-gray-600 text-gray-300 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
          >
            QR Code
          </button>

          {/* Top-up form */}
          {showTopUp && (
            <div className="space-y-2">
              <label htmlFor="topup-amount" className="text-gray-200 text-sm font-medium block">
                Top-up Amount (USDC)
              </label>
              <input
                id="topup-amount"
                type="number"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                placeholder="Amount (USDC)"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              />
              <button
                onClick={handleTopUp}
                disabled={topUpLoading}
                aria-busy={topUpLoading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
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
            aria-expanded={showTopUp}
            className="w-full border border-gray-600 text-gray-300 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            disabled={topUpLoading}
            className="w-full border border-gray-600 text-gray-300 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {showTopUp ? "Cancel Top-up" : "Top Up Stream"}
          </button>

          {/* Transaction history */}
          <StreamErrorBoundary section="Transaction History" resetKey={stream.id}>
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
                  className="flex-1 bg-gray-700 text-white py-2 rounded-lg text-sm hover:bg-gray-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                >
                  Download CSV
                </button>
                <button
                  onClick={() => downloadJSON(historyEntries, params.id)}
                  className="flex-1 bg-gray-700 text-white py-2 rounded-lg text-sm hover:bg-gray-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                >
                  Download JSON
                </button>
              </div>
            </section>
          </StreamErrorBoundary>
        </div>
      </div>

      <StreamQrModal
        open={showQrModal}
        onClose={() => setShowQrModal(false)}
        recipient={stream.recipient}
        amount={(stream.deposit / 10_000_000).toString()}
        token="USDC"
        duration={Math.round((new Date(stream.endTime).getTime() - new Date(stream.startTime).getTime()) / 1000)}
      />

      {/* Cancel confirmation modal */}
      {showCancelModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-modal-title"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-modal-title"
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
        >
          <div className="bg-gray-800 rounded-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h2 id="cancel-modal-title" className="text-lg font-semibold text-white">
              Cancel Stream?
            </h2>
            <h2 className="text-lg font-semibold text-white">Cancel Stream?</h2>
            <p className="text-gray-400 text-sm">
              This is irreversible. Any unstreamed funds will be returned to the
              sender. You&apos;ll have 5 seconds to undo after confirming.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 border border-gray-600 text-gray-300 py-2 rounded-lg hover:bg-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                className="flex-1 border border-gray-600 text-gray-300 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={handleCancelConfirmed}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors"
                disabled={cancelLoading}
                aria-busy={cancelLoading}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              >
                {cancelLoading ? "Cancelling…" : "Yes, Cancel"}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
