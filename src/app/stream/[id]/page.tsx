"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import StreamTimeline from "@/components/StreamTimeline";
import StreamHistory from "@/components/StreamHistory";
import LiveCounter from "@/components/LiveCounter";
import { downloadCSV, downloadJSON, StreamHistoryEntry } from "@/src/lib/export";
import { SkeletonDetail } from "@/components/Skeleton";
import { sorostream, StreamData } from "@/src/lib/sorostream";

export type HistoryEntry = StreamHistoryEntry;

export default function StreamDetail({ params }: { params: { id: string } }) {
  const [stream, setStream] = useState<StreamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [txStatus, setTxStatus] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await sorostream.getStream(params.id);
        setStream(data);
      } catch (err) {
        console.error("Failed to load stream", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  async function handleTopUp() {
    if (!topUpAmount || parseFloat(topUpAmount) <= 0) return;
    setTopUpLoading(true);
    setTxStatus(null);
    try {
      await sorostream.topUp();
      setTxStatus("Top-up successful!");
      setShowTopUp(false);
      setTopUpAmount("");
      // Reload stream
      const data = await sorostream.getStream(params.id);
      setStream(data);
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
    } catch {
      setTxStatus("Cancellation failed. Please try again.");
    } finally {
      setCancelLoading(false);
    }
  }

  if (loading || !stream) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-8">Stream #{params.id}</h1>
          <SkeletonDetail />
        </div>
      </main>
    );
  }

  if (!stream) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-4">
            <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">← Dashboard</Link>
          </div>
          <h1 className="text-2xl font-bold mb-8">Stream #{params.id}</h1>
          <p className="text-red-400">Stream not found.</p>
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
        <div className="flex gap-4 text-sm text-gray-400 mb-8">
          <span>From: <span className="text-white font-mono">{stream.sender}</span></span>
          <span>To: <span className="text-white font-mono">{stream.recipient}</span></span>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 space-y-6">
          <StreamTimeline startTime={stream.startTime} endTime={stream.endTime} />
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">Claimable now</p>
            <div className="text-2xl sm:text-3xl font-bold">
              <LiveCounter flowRate={stream.flowRate} lastWithdrawTime={new Date(stream.lastWithdrawTime)} />
            </div>
          </div>
          {status && <p className="text-green-400 text-sm text-center">{status}</p>}
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <div className="flex gap-4">
            <button className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors">Withdraw</button>
            <button className="flex-1 border border-red-600 text-red-400 py-3 rounded-lg font-medium hover:bg-red-900 transition-colors">Cancel</button>
          </div>

          <section aria-labelledby="history-heading">
            <h2 id="history-heading" className="text-lg font-semibold mb-3">Transaction History</h2>
            <StreamHistory entries={history} />
            <div className="mt-4">
              <p className="text-gray-400 text-sm font-medium mb-3">History Export</p>
              <div className="flex gap-3">
                <button
                  onClick={() => downloadCSV(history, params.id)}
                  className="flex-1 bg-gray-700 text-white py-2 rounded-lg text-sm hover:bg-gray-600 transition-colors"
                >
                  Download CSV
                </button>
                <button
                  onClick={() => downloadJSON(history, params.id)}
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
