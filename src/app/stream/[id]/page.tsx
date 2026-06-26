"use client";
import { useState } from "react";
import StreamTimeline from "@/components/StreamTimeline";
import LiveCounter from "@/components/LiveCounter";
import { sorostream } from "@/lib/sorostream";
import { connectWallet } from "@/lib/freighter";

export default function StreamDetail({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState<"withdraw" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  async function handleWithdraw() {
    setError(null);
    setLoading("withdraw");
    try {
      const wallet = await connectWallet();
      if (!wallet) throw new Error("Wallet not connected");
      const result = await sorostream.withdraw();
      setTxHash(result.txHash);
    } catch (e: any) {
      setError(e.message ?? "Withdraw failed");
    } finally {
      setLoading(null);
    }
  }

  async function handleCancel() {
    setShowCancelModal(false);
    setError(null);
    setLoading("cancel");
    try {
      const wallet = await connectWallet();
      if (!wallet) throw new Error("Wallet not connected");
      const result = await sorostream.cancelStream();
      setTxHash(result.txHash);
    } catch (e: any) {
      setError(e.message ?? "Cancel failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">Stream #{params.id}</h1>
        <div className="bg-gray-800 rounded-xl p-6 space-y-6">
          <StreamTimeline />
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">Claimable now</p>
            <div className="text-3xl font-bold">
              <LiveCounter flowRate={0} lastWithdrawTime={new Date()} />
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}
          {txHash && (
            <p className="text-green-400 text-sm text-center break-all">
              Tx: {txHash}
            </p>
          )}

          <div className="flex gap-4">
            <button
              onClick={handleWithdraw}
              disabled={loading !== null}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {loading === "withdraw" ? "Withdrawing…" : "Withdraw"}
            </button>
            <button
              onClick={() => setShowCancelModal(true)}
              disabled={loading !== null}
              className="flex-1 border border-red-600 text-red-400 py-3 rounded-lg font-medium hover:bg-red-900 disabled:opacity-50"
            >
              {loading === "cancel" ? "Cancelling…" : "Cancel"}
            </button>
          </div>
        </div>
      </div>

      {/* Cancel confirmation modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h2 className="text-lg font-bold">Cancel stream?</h2>
            <p className="text-gray-400 text-sm">
              This is irreversible and will affect the recipient&apos;s funds.
              Are you sure you want to cancel this stream?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600"
              >
                Go back
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
              >
                Yes, cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
