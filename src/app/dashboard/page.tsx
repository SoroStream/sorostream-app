"use client";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StreamListSkeleton } from "@/components/Skeleton";
import StreamVirtualList from "@/components/StreamVirtualList";
import StreamEventFeed from "@/components/StreamEventFeed";
import KeyboardShortcutsHelp from "@/components/KeyboardShortcutsHelp";
import { getMockStreams, watchClaimable, sorostream, getMockStreamHistory, StreamData } from "@/src/lib/sorostream";
import { useRpcFetch } from "@/src/lib/useRpcFetch";
import { useToast } from "@/src/lib/toast";
import { downloadCSV } from "@/src/lib/export";
import { useKeyboardShortcuts, type ShortcutGroup } from "@/src/lib/useKeyboardShortcuts";

type DashboardState = "loading" | "empty" | "ready";

export default function Dashboard() {
  const rpcFetch = useRpcFetch();
  const router = useRouter();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [streams, setStreams] = useState<StreamData[]>([]);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

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

  const allFilteredSelected = useMemo(
    () => filtered.length > 0 && filtered.every((s) => selectedIds.has(s.id)),
    [filtered, selectedIds],
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((s) => s.id)));
    }
  }, [allFilteredSelected, filtered]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleBulkCancel = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkLoading(true);
    try {
      await Promise.all(ids.map(() => sorostream.cancelStream()));
      addToast(`Cancelled ${ids.length} stream(s) successfully.`, "success");
      const data = await rpcFetch(() => Promise.resolve(getMockStreams()));
      setStreams(data);
      clearSelection();
    } catch {
      addToast("Bulk cancel failed. Please try again.", "error");
    } finally {
      setBulkLoading(false);
    }
  }, [selectedIds, addToast, rpcFetch]);

  const handleBulkTopUp = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkLoading(true);
    try {
      await Promise.all(ids.map(() => sorostream.topUp()));
      addToast(`Topped up ${ids.length} stream(s) successfully.`, "success");
      const data = await rpcFetch(() => Promise.resolve(getMockStreams()));
      setStreams(data);
      clearSelection();
    } catch {
      addToast("Bulk top-up failed. Please try again.", "error");
    } finally {
      setBulkLoading(false);
    }
  }, [selectedIds, addToast, rpcFetch]);

  const handleBulkExport = useCallback(() => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const allEntries = ids.flatMap((id) => getMockStreamHistory(id));
    if (allEntries.length === 0) {
      addToast("No history entries for selected streams.", "info");
      return;
    }
    downloadCSV(allEntries, `bulk-${ids.length}-streams`);
    addToast(`Exported history for ${ids.length} stream(s).`, "success");
  }, [selectedIds, addToast]);

  const shortcutGroups: ShortcutGroup[] = useMemo(() => [
    {
      title: "Dashboard",
      shortcuts: [
        { key: "n", description: "New stream", action: () => router.push("/stream/new") },
        { key: "/", description: "Focus search", action: () => searchRef.current?.focus(), ignoreWhenEditing: false },
        { key: "Escape", description: "Clear search / selection", action: () => { setSearch(""); clearSelection(); (document.activeElement as HTMLElement)?.blur(); } },
        { key: "?", shift: true, description: "Toggle keyboard shortcuts help", action: () => setShowShortcutsHelp((v) => !v) },
      ],
    },
  ], [router]);

  useKeyboardShortcuts(shortcutGroups);

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
            <div className="flex items-center gap-3 mb-6">
              {state === "ready" && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 accent-green-500 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                    aria-label={allFilteredSelected ? "Deselect all" : "Select all"}
                  />
                  <span className="text-xs text-gray-400">
                    {allFilteredSelected ? "Deselect all" : "Select all"}
                  </span>
                </label>
              )}
              <input
                ref={searchRef}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by address or status…"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                aria-label="Search streams"
              />
            </div>

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
                <StreamVirtualList
                  streams={filtered}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                />
              </div>
            )}
          </div>

          <div className="w-full lg:w-80 shrink-0">
            <StreamEventFeed />
          </div>
        </div>
      </div>

      <KeyboardShortcutsHelp
        open={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
        groups={shortcutGroups}
      />
    </main>
  );
}
