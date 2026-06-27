"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { StreamListSkeleton } from "@/components/Skeleton";
import { getMockStreams, StreamData } from "@/src/lib/sorostream";

type DashboardState = "loading" | "empty" | "ready";

const PAGE_SIZE = 10;

export default function Dashboard() {
  const rpcFetch = useRpcFetch();
  const [loading, setLoading] = useState(true);
  const [streams, setStreams] = useState<StreamData[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const data = await rpcFetch(() =>
          Promise.resolve(getMockStreams()),
        );
        setStreams(data);
      } catch {
        // Errors are surfaced via toast by rpcFetch; leave streams empty.
      } finally {
        setLoading(false);
      }
    }
    void load();
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  useEffect(() => {
    setPage(0);
  }, [search]);

  const state: DashboardState = loading
    ? "loading"
    : filtered.length === 0
    ? "empty"
    : "ready";

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <Link
            href="/stream/new"
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors"
          >
            + New Stream
          </Link>
        </div>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by address or status…"
          className="w-full mb-6 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
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
          <>
            <div className="grid gap-4 md:grid-cols-2 transition-opacity duration-300 opacity-100">
              {paged.map((stream) => (
                <Link key={stream.id} href={`/stream/${stream.id}`} className="block">
                  <StreamCard
                    id={stream.id}
                    sender={stream.sender}
                    recipient={stream.recipient}
                    flowRate={stream.flowRate}
                    deposit={stream.deposit}
                    status={stream.status}
                  />
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <button
                  disabled={safePage === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="px-4 py-2 rounded-lg border border-gray-700 text-sm disabled:opacity-50 hover:bg-gray-800 transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-400">
                  Page {safePage + 1} of {totalPages}
                </span>
                <button
                  disabled={safePage >= totalPages - 1}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  className="px-4 py-2 rounded-lg border border-gray-700 text-sm disabled:opacity-50 hover:bg-gray-800 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
