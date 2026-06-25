"use client";
import { useState, useEffect } from "react";
import StreamTimeline from "@/components/StreamTimeline";
import LiveCounter from "@/components/LiveCounter";
import { downloadCSV, downloadJSON, StreamHistoryEntry } from "@/lib/export";
import { SkeletonDetail } from "@/components/Skeleton";

const MOCK_HISTORY: StreamHistoryEntry[] = [
  { timestamp: "2025-01-15T10:00:00Z", type: "creation", amount: "10000.00", txHash: "abc123" },
  { timestamp: "2025-02-01T08:30:00Z", type: "withdrawal", amount: "2500.00", txHash: "def456" },
  { timestamp: "2025-03-01T12:00:00Z", type: "top-up", amount: "5000.00", txHash: "ghi789" },
];

export default function StreamDetail({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-8">Stream #{params.id}</h1>
          <SkeletonDetail />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-4">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">← Dashboard</Link>
        </div>
        <h1 className="text-2xl font-bold mb-2">Stream #{stream.id}</h1>
        <div className="flex gap-4 text-sm text-gray-400 mb-8">
          <span>From: <span className="text-white font-mono">{stream.sender}</span></span>
          <span>To: <span className="text-white font-mono">{stream.recipient}</span></span>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 space-y-6">
          <StreamTimeline />
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">Claimable now</p>
            <div className="text-2xl sm:text-3xl font-bold">
              <LiveCounter flowRate={0} lastWithdrawTime={new Date()} />
            </div>
          </div>
          {status && <p className="text-green-400 text-sm text-center">{status}</p>}
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <div className="flex gap-4">
            <button className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors">Withdraw</button>
            <button className="flex-1 border border-red-600 text-red-400 py-3 rounded-lg font-medium hover:bg-red-900 transition-colors">Cancel</button>
          </div>
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
                  onClick={() => { setShowTopUp(false); setTopUpAmount(""); }}
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
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
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
