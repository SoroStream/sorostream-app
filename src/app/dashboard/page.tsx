"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StreamCard from "@/components/StreamCard";
import { getClient, type Stream } from "@/src/lib/sorostream";
import { connectWallet } from "@sorostream/sdk";
import type { StreamStatus } from "@sorostream/sdk";

type Tab = "sent" | "received";
const STATUSES: StreamStatus[] = ["Active", "Cancelled", "Completed"];

export default function Dashboard() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [sent, setSent] = useState<Stream[]>([]);
  const [received, setReceived] = useState<Stream[]>([]);
  const [tab, setTab] = useState<Tab>("sent");
  const [statusFilter, setStatusFilter] = useState<StreamStatus | "All">("All");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    connectWallet().then((key) => {
      if (key) setWallet(key);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!wallet) return;
    setLoading(true);
    setError(null);

    getClient().then((client) =>
      Promise.all([
        client.getStreamsBySender(wallet),
        client.getStreamsByRecipient(wallet),
      ])
    ).then(([s, r]) => {
      setSent(s);
      setReceived(r);
    }).catch((e) => {
      setError(e instanceof Error ? e.message : "Failed to load streams");
    }).finally(() => setLoading(false));
  }, [wallet]);

  const streams = tab === "sent" ? sent : received;
  const filtered = statusFilter === "All"
    ? streams
    : streams.filter((s) => s.status === statusFilter);

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <Link href="/stream/new" className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">
            + New Stream
          </Link>
        </div>

        {!wallet ? (
          <div className="bg-gray-800 rounded-xl p-8 text-center">
            <p className="text-gray-400 mb-4">Connect your Freighter wallet to see your streams</p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              {(["sent", "received"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
                    tab === t ? "bg-green-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
                  }`}
                >
                  {t} ({(t === "sent" ? sent : received).length})
                </button>
              ))}
            </div>

            {/* Status filter */}
            <div className="flex gap-2 mb-6">
              {(["All", ...STATUSES] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    statusFilter === s
                      ? "bg-green-700 text-white"
                      : "bg-gray-700 text-gray-400 hover:text-white"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {loading && <p className="text-gray-400">Loading streams…</p>}
            {error && <p className="text-red-400">{error}</p>}

            {!loading && !error && filtered.length === 0 ? (
              <div className="bg-gray-800 rounded-xl p-8 text-center">
                <p className="text-gray-400 mb-4">No streams yet</p>
                <Link href="/stream/new" className="text-green-400 hover:text-green-300">
                  Create your first stream →
                </Link>
              </div>
            ) : (
              <div className="grid gap-4">
                {filtered.map((stream) => (
                  <Link key={stream.id} href={`/stream/${stream.id}`}>
                    <StreamCard
                      id={stream.id}
                      sender={stream.sender}
                      recipient={stream.recipient}
                      flowRate={Number(stream.flowRate)}
                      status={stream.status}
                      deposit={Number(stream.deposit)}
                    />
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
