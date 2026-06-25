"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { SkeletonCard } from "@/components/Skeleton";

type DashboardState = "loading" | "empty" | "ready";

export default function Dashboard() {
  const [state, setState] = useState<DashboardState>("loading");

  useEffect(() => {
    const timer = setTimeout(() => setState("empty"), 1200);
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
        )}

        {state === "empty" && (
          <div className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700" role="status">
            <div className="text-4xl mb-4" aria-hidden="true">📭</div>
            <p className="text-gray-400 mb-2 font-medium">No streams yet</p>
            <p className="text-gray-500 text-sm mb-6">Create your first payment stream to get started.</p>
            <Link href="/stream/new" className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
              Create your first stream →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
