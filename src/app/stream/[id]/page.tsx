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
    <main className="min-h-screen bg-gray-900 text-white p-8">
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
            <div className="text-3xl font-bold">
              <LiveCounter flowRate={0} lastWithdrawTime={new Date()} />
            </div>
          </div>
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
        </div>
      </div>
    </main>
  );
}
