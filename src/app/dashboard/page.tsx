"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { SkeletonCard } from "@/components/Skeleton";
import StreamCard from "@/components/StreamCard";
import { getMockStreams, StreamData } from "@/lib/sorostream";

type DashboardState = "loading" | "empty" | "ready";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [streams, setStreams] = useState<StreamData[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStreams(getMockStreams());
      setLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <Link href="/stream/new" className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors">+ New Stream</Link>
        </div>

        {state === "loading" && (
          <div className="grid gap-4 md:grid-cols-2" role="status" aria-live="polite" aria-label="Loading streams">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : streams.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {streams.map((s) => (
              <StreamCard key={s.id} id={s.id} sender={s.sender} recipient={s.recipient} flowRate={s.flowRate} status={s.status} deposit={s.deposit} />
            ))}
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl p-8 text-center">
            <p className="text-gray-400 mb-4">No streams yet</p>
            <Link href="/stream/new" className="text-green-400 hover:text-green-300">Create your first stream →</Link>
          </div>
        )}
      </div>
    </main>
  );
}
