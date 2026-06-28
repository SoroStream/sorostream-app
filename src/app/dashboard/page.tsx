"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { StreamListSkeleton } from "@/components/Skeleton";
import StreamVirtualList from "@/components/StreamVirtualList";
import StreamEventFeed from "@/components/StreamEventFeed";
import { getMockStreams, watchClaimable, StreamData } from "@/src/lib/sorostream";
import { useRpcFetch } from "@/src/lib/useRpcFetch";

type DashboardState = "loading" | "empty" | "ready";

export default function Dashboard() {
  const rpcFetch = useRpcFetch();
  const [loading, setLoading] = useState(true);
  const [streams, setStreams] = useState<StreamData[]>([]);
  const [search, setSearch] = useState("");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await rpcFetch(() =>
          Promise.resolve(getMockStreams()),
        );
        if (!cancelled) setStreams(data);
      } catch {
        // Errors are surfaced via toast by rpcFetch; leave streams empty.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();

    // Poll for claimable updates every 30s without resetting scroll position.
    pollRef.current = setInterval(async () => {
      try {
        const data = await rpcFetch(() =>
          Promise.resolve(watchClaimable(getMockStreams())),
        );
        if (!cancelled) setStreams(data);
      } catch {
        // silently keep current data
      }
    }, 30000);

    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return streams;
    const q = search.trim().toLowerCase();
    return streams.filter(
      (s) =>
        s.sender.toLowerCase().includes(q) ||
        s.recipient.toLowerCase().includes(q) ||
        s.status.toLowerCase().includes(q)
    );
  }, [streams, search]);

  const state: DashboardState = loading
    ? "loading"
    : filtered.length === 0
    ? "empty"
    : "ready";

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <Link
            href="/stream/new"
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            + New Stream
          </Link>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by address or status…"
              className="w-full mb-6 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              aria-label="Search streams"
            />

            {state === "loading" ? (
              <StreamListSkeleton />
            ) : state === "empty" ? (
              <div className="bg-gray-800 rounded-xl p-8 text-center">
                <p className="text-gray-400 mb-4">No streams found</p>
                <Link href="/stream/new" className="text-green-400 hover:text-green-300">
                  Create your first stream →
                </Link>
              </div>
            ) : (
              <div className="rounded-xl border border-gray-700 bg-gray-900 p-2">
                <StreamVirtualList streams={filtered} />
              </div>
            )}
          </div>

          <div className="w-full lg:w-80 shrink-0">
            <StreamEventFeed />
          </div>
        </div>
      </div>
    </main>
  );
}
