"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { SkeletonCard } from "@/components/Skeleton";
import { getMockStreams, StreamData } from "@/lib/sorostream";

const PAGE_SIZE = 3;

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [streams, setStreams] = useState<StreamData[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStreams(getMockStreams());
      setLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const visible = streams.slice(0, visibleCount);
  const hasMore = visibleCount < streams.length;

  function handleLoadMore() {
    setVisibleCount((c) => Math.min(c + PAGE_SIZE, streams.length));
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <Link href="/stream/new" className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors">+ New Stream</Link>
        </div>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : streams.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-8 text-center">
            <p className="text-gray-400 mb-4">No streams yet</p>
            <Link href="/stream/new" className="text-green-400 hover:text-green-300">Create your first stream →</Link>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {visible.map((stream) => (
                <Link key={stream.id} href={`/stream/${stream.id}`} className="block">
                  <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-green-500 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-700 text-gray-300">
                        {stream.status}
                      </span>
                      <span className="text-xs text-gray-400">#{stream.id}</span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-400">From</p>
                        <p className="text-sm font-mono text-white">{stream.sender}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">To</p>
                        <p className="text-sm font-mono text-white">{stream.recipient}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {hasMore && (
              <div className="mt-6 text-center">
                <button
                  onClick={handleLoadMore}
                  className="px-6 py-2 rounded-lg border border-gray-700 text-sm hover:bg-gray-800 transition-colors"
                >
                  Load More ({streams.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
