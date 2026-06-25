"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import StreamTimeline from "@/components/StreamTimeline";
import LiveCounter from "@/components/LiveCounter";
import { downloadCSV, downloadJSON, StreamHistoryEntry } from "@/src/lib/export";
import { SkeletonDetail } from "@/components/Skeleton";
import { sorostream, StreamData } from "@/src/lib/sorostream";

const MOCK_HISTORY: StreamHistoryEntry[] = [
  { timestamp: "2025-01-15T10:00:00Z", type: "creation", amount: "10000.00", txHash: "abc123" },
  { timestamp: "2025-02-01T08:30:00Z", type: "withdrawal", amount: "2500.00", txHash: "def456" },
  { timestamp: "2025-03-01T12:00:00Z", type: "top-up", amount: "5000.00", txHash: "ghi789" },
];

export default function StreamDetail({ params }: { params: { id: string } }) {
  const [stream, setStream] = useState<StreamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [txStatus, setTxStatus] = useState<string | null>(null);

  async function loadStream() {
    try {
      const data = await sorostream.getStream(params.id);
      if (data) {
        setStream(data);
        setError(null);
      } else {
        setError(`Stream #${params.id} not found.`);
      }
    } catch (err) {
      setError("Failed to load stream details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStream();
  }, [params.id]);

  async function handleTopUp() {
    if (!topUpAmount || parseFloat(topUpAmount) <= 0) return;
    setTopUpLoading(true);
    setTxStatus(null);
    try {
      const result = await sorostream.topUp();
      setTxStatus(`Top-up successful! Tx: ${result.txHash || "mock-tx-hash"}`);
      setShowTopUp(false);
      setTopUpAmount("");
      await loadStream();
    } catch {
      setTxStatus("Top-up failed. Please try again.");
    } finally {
      setTopUpLoading(false);
    }
  }

  async function handleWithdraw() {
    setWithdrawLoading(true);
    setTxStatus(null);
    try {
      const result = await sorostream.withdraw();
      setTxStatus(`Withdrawal submitted! Tx: ${result.txHash}`);
      await loadStream();
    } catch {
      setTxStatus("Withdrawal failed. Please try again.");
    } finally {
      setWithdrawLoading(false);
    }
  }

  async function handleCancel() {
    setCancelLoading(true);
    setTxStatus(null);
    try {
      const result = await sorostream.cancelStream();
      setTxStatus(`Stream cancelled. Tx: ${result.txHash}`);
      await loadStream();
    } catch {
      setTxStatus("Cancellation failed. Please try again.");
    } finally {
      setCancelLoading(false);
    }
  }

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

  if (error || !stream) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <h1 className="text-2xl font-bold text-red-400">Error</h1>
          <p className="text-gray-300">{error || "Stream not found"}</p>
          <Link
            href="/dashboard"
            className="inline-block bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            ← Dashboard
          </Link>
        </div>
      </main>
    );
  }

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
            From: <span className="text-white font-mono">{stream.sender}</span>
          </span>
          <span className="hidden sm:inline">|</span>
          <span>
            To: <span className="text-white font-mono">{stream.recipient}</span>
          </span>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 sm:p-6 space-y-6">
          <StreamTimeline startTime={stream.startTime} endTime={stream.endTime} />
          
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">Claimable now</p>
            <div className="text-2xl sm:text-3xl font-bold">
              <LiveCounter flowRate={stream.flowRate} lastWithdrawTime={new Date(stream.lastWithdrawTime)} />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <button
              onClick={handleWithdraw}
              disabled={withdrawLoading || stream.status !== "Active"}
              className="w-full sm:flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-busy={withdrawLoading}
              aria-label={withdrawLoading ? "Withdrawing, please wait" : "Withdraw from stream"}
            >
              {withdrawLoading ? "Withdrawing…" : "Withdraw"}
            </button>
            <button
              onClick={() => setShowTopUp(true)}
              disabled={stream.status !== "Active"}
              className="w-full sm:flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Top up stream with additional funds"
            >
              Top Up
            </button>
            <button
              onClick={handleCancel}
              disabled={cancelLoading || stream.status !== "Active"}
              className="w-full sm:flex-1 border border-red-600 text-red-400 py-3 rounded-lg font-medium hover:bg-red-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-busy={cancelLoading}
              aria-label={cancelLoading ? "Cancelling stream, please wait" : "Cancel stream"}
            >
              {cancelLoading ? "Cancelling…" : "Cancel"}
            </button>
          </div>

          {showTopUp && (
            <div className="bg-gray-700 rounded-lg p-4 space-y-4" role="dialog" aria-label="Top up stream form">
              <div>
                <label htmlFor="topUpAmount" className="text-gray-400 text-sm block mb-2">
                  Additional Amount (USDC)
                </label>
                <input
                  id="topUpAmount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={topUpAmount}
                  onChange={e => setTopUpAmount(e.target.value)}
                  placeholder="100"
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white"
                  aria-required="true"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleTopUp}
                  disabled={topUpLoading || !topUpAmount || parseFloat(topUpAmount) <= 0}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-busy={topUpLoading}
                  aria-label={topUpLoading ? "Submitting top-up, please wait" : "Confirm top-up"}
                >
                  {topUpLoading ? "Submitting…" : "Confirm"}
                </button>
                <button
                  onClick={() => {
                    setShowTopUp(false);
                    setTopUpAmount("");
                  }}
                  className="flex-1 border border-gray-500 text-gray-300 py-2 rounded-lg font-medium hover:bg-gray-600 transition-colors"
                  aria-label="Cancel top-up"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {txStatus && (
            <div className="text-sm text-center text-green-400" role="status" aria-live="polite">
              {txStatus}
            </div>
          )}

          <div>
            <p className="text-gray-400 text-sm font-medium mb-3">History Export</p>
            <div className="flex gap-3">
              <button
                onClick={() => downloadCSV(MOCK_HISTORY, params.id)}
                className="flex-1 bg-gray-700 text-white py-2 rounded-lg text-sm hover:bg-gray-600 transition-colors"
              >
                Download CSV
              </button>
              <button
                onClick={() => downloadJSON(MOCK_HISTORY, params.id)}
                className="flex-1 bg-gray-700 text-white py-2 rounded-lg text-sm hover:bg-gray-600 transition-colors"
              >
                Download JSON
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
