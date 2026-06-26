"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LiveCounter from "@/components/LiveCounter";
import StreamHistory from "@/components/StreamHistory";
import StreamTimeline from "@/components/StreamTimeline";
import { StreamListSkeleton } from "@/components/Skeleton";
import { downloadCSV, downloadJSON, StreamHistoryEntry } from "@/src/lib/export";
import { getMockStreamHistory, sorostream, StreamData } from "@/src/lib/sorostream";

type ActionLoading = "top-up" | "withdraw" | "cancel" | null;

export default function StreamDetail({ params }: { params: { id: string } }) {
  const [stream, setStream] = useState<StreamData | null>(null);
  const [historyEntries, setHistoryEntries] = useState<StreamHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<ActionLoading>(null);
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        if (!cancelled) setLoading(false);
      }
    }

    void loadStream();

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  async function refreshStream() {
    const data = await sorostream.getStream(params.id);
    setStream(data);
    setHistoryEntries(data ? getMockStreamHistory(params.id) : []);
  }

  async function handleTopUp() {
    if (!topUpAmount || Number(topUpAmount) <= 0) return;

    setActionLoading("top-up");
    setTxStatus(null);
    setError(null);
    try {
      const result = await sorostream.topUp();
      setTxStatus(`Top-up submitted. Tx: ${result.txHash || "pending"}`);
      setShowTopUp(false);
      setTopUpAmount("");
      await refreshStream();
    } catch {
      setError("Top-up failed. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleWithdraw() {
    setActionLoading("withdraw");
    setTxStatus(null);
    setError(null);
    try {
      const result = await sorostream.withdraw();
      setTxStatus(`Withdrawal submitted. Tx: ${result.txHash}`);
      await refreshStream();
    } catch {
      setError("Withdrawal failed. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancelConfirmed() {
    setShowCancelModal(false);
    setActionLoading("cancel");
    setTxStatus(null);
    setError(null);
    try {
      const result = await sorostream.cancelStream();
      setTxStatus(`Stream cancelled. Tx: ${result.txHash}`);
      await refreshStream();
    } catch {
      setError("Cancellation failed. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/dashboard"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold my-6">Stream #{params.id}</h1>
          <StreamListSkeleton label="Loading stream detail" />
        </div>
      </main>
    );
  }

  if (!stream) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/dashboard"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold my-6">Stream #{params.id}</h1>
          <p className="text-red-400">{error ?? "Stream not found."}</p>
        </div>
      </main>
    );
  }

  const isBusy = actionLoading !== null;

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-2xl mx-auto transition-opacity duration-300 opacity-100">
        <Link
          href="/dashboard"
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Back to Dashboard
        </Link>

        <h1 className="text-2xl font-bold mt-6 mb-2">Stream #{stream.id}</h1>
        <div className="flex flex-col sm:flex-row sm:gap-4 text-sm text-gray-400 mb-8">
          <span>
            From: <span className="text-white font-mono">{stream.sender}</span>
          </span>
          <span className="hidden sm:inline">|</span>
          <span>
            To: <span className="text-white font-mono">{stream.recipient}</span>
          </span>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 space-y-6 border border-gray-700">
          <StreamTimeline startTime={stream.startTime} endTime={stream.endTime} />

          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">Claimable now</p>
            <div className="text-2xl sm:text-3xl font-bold">
              <LiveCounter
                streamId={stream.id}
                flowRate={stream.flowRate}
                lastWithdrawTime={new Date(stream.lastWithdrawTime)}
              />
            </div>
          </div>

          {txStatus && (
            <p className="text-green-400 text-sm text-center break-all">{txStatus}</p>
          )}
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <div className="flex gap-4">
            <button
              onClick={handleWithdraw}
              disabled={isBusy}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {actionLoading === "withdraw" ? "Withdrawing..." : "Withdraw"}
            </button>
            <button
              onClick={() => setShowCancelModal(true)}
              disabled={isBusy}
              className="flex-1 border border-red-600 text-red-400 py-3 rounded-lg font-medium hover:bg-red-900 disabled:opacity-50 transition-colors"
            >
              {actionLoading === "cancel" ? "Cancelling..." : "Cancel"}
            </button>
          </div>

          {showTopUp && (
            <div className="space-y-2">
              <input
                type="number"
                value={topUpAmount}
                onChange={(event) => setTopUpAmount(event.target.value)}
                placeholder="Amount (USDC)"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm"
              />
              <button
                onClick={handleTopUp}
                disabled={isBusy || !topUpAmount || Number(topUpAmount) <= 0}
                className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading === "top-up" ? "Topping up..." : "Confirm Top-up"}
              </button>
            </div>
          )}

          <button
            onClick={() => setShowTopUp((value) => !value)}
            disabled={isBusy}
            className="w-full border border-gray-600 text-gray-300 py-2 rounded-lg text-sm hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {showTopUp ? "Cancel Top-up" : "Top Up Stream"}
          </button>

          <section aria-labelledby="history-heading">
            <h2 id="history-heading" className="text-lg font-semibold mb-3">
              Transaction History
            </h2>
            <StreamHistory entries={historyEntries} />
            <div className="mt-4">
              <p className="text-gray-400 text-sm font-medium mb-3">History Export</p>
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
            </div>
          </section>
        </div>
      </div>

      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-sm w-full mx-4 space-y-4 border border-gray-700">
            <h2 className="text-lg font-semibold text-white">Cancel Stream?</h2>
            <p className="text-gray-400 text-sm">
              This is irreversible. Any unstreamed funds will be returned to the sender.
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
                disabled={isBusy}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading === "cancel" ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
