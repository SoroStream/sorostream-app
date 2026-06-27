"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import StreamTimeline from "@/components/StreamTimeline";
import StreamHistory from "@/components/StreamHistory";
import LiveCounter from "@/components/LiveCounter";
import FiatDisplay from "@/components/FiatDisplay";
import FederationName from "@/components/FederationName";
import { SkeletonDetail } from "@/components/Skeleton";
import { downloadCSV, downloadJSON, type StreamHistoryEntry } from "@/src/lib/export";
import { sorostream, type StreamData, getMockStreamHistory } from "@/src/lib/sorostream";
import { useRpcFetch } from "@/src/lib/useRpcFetch";

export default function StreamDetail({ params }: { params: { id: string } }) {
  const rpcFetch = useRpcFetch();

  const [stream, setStream] = useState<StreamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyEntries, setHistoryEntries] = useState<StreamHistoryEntry[]>([]);

  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Load stream data ──────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await rpcFetch(() => sorostream.getStream(params.id));
        setStream(data);
        setHistoryEntries(getMockStreamHistory(params.id));
      } catch {
        setError("Failed to load stream data.");
      } finally {
        setLoading(false);
      }
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  // ── Actions ───────────────────────────────────────────────────────────────
  async function handleTopUp() {
    if (!topUpAmount || parseFloat(topUpAmount) <= 0) return;
    setTopUpLoading(true);
    setTxStatus(null);
    setError(null);
    try {
      await rpcFetch(() => sorostream.topUp());
      setTxStatus("Top-up successful!");
      setShowTopUp(false);
      setTopUpAmount("");
      const data = await rpcFetch(() => sorostream.getStream(params.id));
      setStream(data);
    } catch {
      setError("Top-up failed. Please try again.");
    } finally {
      setTopUpLoading(false);
    }
  }

  async function handleWithdraw() {
    setWithdrawLoading(true);
    setTxStatus(null);
    setError(null);
    try {
      const result = await rpcFetch(() => sorostream.withdraw());
      setTxStatus(`Withdrawal submitted! Tx: ${result.txHash}`);
    } catch {
      setError("Withdrawal failed. Please try again.");
    } finally {
      setWithdrawLoading(false);
    }
  }

  async function handleCancelConfirmed() {
    setShowCancelModal(false);
    setCancelLoading(true);
    setTxStatus(null);
    setError(null);
    try {
      const result = await rpcFetch(() => sorostream.cancelStream());
      setTxStatus(`Stream cancelled. Tx: ${result.txHash}`);
    } catch {
      setError("Cancellation failed. Please try again.");
    } finally {
      setCancelLoading(false);
    }
  }

  // ── Render: loading ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-2xl mx-auto animate-pulse">
          <h1 className="text-2xl font-bold mb-8">Stream #{params.id}</h1>
          <SkeletonDetail />
        </div>
      </main>
    );
  }

  // ── Render: not found ─────────────────────────────────────────────────────
  if (!stream) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-4">
            <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">
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

  // ── Render: detail ────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-4">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">
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
          <span className="hidden sm:inline">|</span>
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

          {/* Claimable live counter */}
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">Claimable now</p>
            <div className="text-2xl sm:text-3xl font-bold">
              <LiveCounter
                flowRate={stream.flowRate}
                lastWithdrawTime={new Date(stream.lastWithdrawTime)}
                streamId={stream.id}
              />
            </div>
          </div>

          {/* Status messages */}
          {txStatus && (
            <p
              className={`text-sm text-center ${
                txStatus.toLowerCase().includes("fail") ? "text-red-400" : "text-green-400"
              }`}
            >
              {txStatus}
            </p>
          )}
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          {/* Primary actions */}
          <div className="flex gap-4">
            <button
              onClick={handleWithdraw}
              disabled={withdrawLoading}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {withdrawLoading ? "Withdrawing…" : "Withdraw"}
            </button>
            <button
              onClick={() => setShowCancelModal(true)}
              disabled={cancelLoading}
              className="flex-1 border border-red-600 text-red-400 py-3 rounded-lg font-medium hover:bg-red-900 disabled:opacity-50 transition-colors"
            >
              {cancelLoading ? "Cancelling…" : "Cancel"}
            </button>
          </div>

          {/* Top-up section */}
          {showTopUp && (
            <div className="space-y-2">
              <input
                type="number"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                placeholder="Amount (XLM)"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm"
              />
              <button
                onClick={handleTopUp}
                disabled={topUpLoading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {topUpLoading ? "Topping up…" : "Confirm Top-up"}
              </button>
            </div>
          )}

          <button
            onClick={() => setShowTopUp((v) => !v)}
            className="w-full border border-gray-600 text-gray-300 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
          >
            {showTopUp ? "Cancel Top-up" : "Top Up Stream"}
          </button>

          {/* Transaction history */}
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

      {/* Cancel confirmation modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h2 className="text-lg font-semibold text-white">Cancel Stream?</h2>
            <p className="text-gray-400 text-sm">
              This is irreversible. Any unstreamed funds will be returned to the sender.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 border border-gray-600 text-gray-300 py-2 rounded-lg hover:bg-gray-700"
              >
                Go Back
              </button>
              <button
                onClick={handleCancelConfirmed}
                disabled={cancelLoading}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {cancelLoading ? "Cancelling…" : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
