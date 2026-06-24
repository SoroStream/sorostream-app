"use client";

import { useEffect, useState } from "react";
import StreamTimeline from "@/components/StreamTimeline";
import LiveCounter from "@/components/LiveCounter";
import { getClient, type Stream, formatUSDC } from "@/src/lib/sorostream";

export default function StreamDetail({ params }: { params: { id: string } }) {
  const [stream, setStream] = useState<Stream | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getClient()
      .then((client) => client.getStream(params.id))
      .then(setStream)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load stream"))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleWithdraw() {
    if (!stream) return;
    const client = await getClient();
    await client.withdraw({ streamId: stream.id });
  }

  async function handleCancel() {
    if (!stream) return;
    const client = await getClient();
    await client.cancelStream({ streamId: stream.id });
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">Stream #{params.id}</h1>

        {loading && <p className="text-gray-400">Loading stream…</p>}
        {error && <p className="text-red-400">{error}</p>}

        {stream && (
          <div className="bg-gray-800 rounded-xl p-6 space-y-6">
            <StreamTimeline
              startTime={new Date(stream.startTime * 1000)}
              endTime={new Date(stream.endTime * 1000)}
            />
            <div className="text-sm text-gray-400 space-y-1">
              <p>Deposit: <span className="text-white">{formatUSDC(stream.deposit)} USDC</span></p>
              <p>Status: <span className="text-white">{stream.status}</span></p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-2">Claimable now</p>
              <div className="text-3xl font-bold">
                <LiveCounter
                  flowRate={Number(stream.flowRate)}
                  lastWithdrawTime={new Date(stream.lastWithdrawTime * 1000)}
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleWithdraw}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700"
              >
                Withdraw
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 border border-red-600 text-red-400 py-3 rounded-lg font-medium hover:bg-red-900"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
