"use client";

import { formatUSDC, truncateAddress } from "@/lib/sorostream";

export interface HistoryEntry {
  timestamp: string;
  type: "withdrawal" | "top-up" | "creation" | "cancellation";
  amount: string;
  txHash: string;
}

interface StreamHistoryProps {
  entries: HistoryEntry[];
  loading?: boolean;
}

const typeConfig: Record<
  HistoryEntry["type"],
  { label: string; icon: string; colorClass: string }
> = {
  creation: { label: "Created", icon: "◉", colorClass: "text-gray-400 bg-gray-800" },
  withdrawal: {
    label: "Withdrawal",
    icon: "↓",
    colorClass: "text-green-400 bg-green-900/30",
  },
  top_up: { label: "Top-up", icon: "↑", colorClass: "text-blue-400 bg-blue-900/30" },
  cancellation: {
    label: "Cancelled",
    icon: "✕",
    colorClass: "text-red-400 bg-red-900/30",
  },
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function StreamHistory({ entries, loading }: StreamHistoryProps) {
  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading stream history">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-4 border border-gray-700 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gray-700" />
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-gray-700 rounded" />
                  <div className="h-3 w-32 bg-gray-700 rounded" />
                </div>
              </div>
              <div className="h-4 w-16 bg-gray-700 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!entries.length) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 text-center border border-gray-700">
        <p className="text-gray-400">No history events recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry, idx) => {
        const config = typeConfig[entry.type] ?? typeConfig.creation;
        return (
          <div
            key={`${entry.txHash}-${idx}`}
            className={`rounded-lg p-4 border ${config.colorClass}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-sm">
                  {config.icon}
                </span>
                <div>
                  <p className="text-sm font-medium text-white">{config.label}</p>
                  <p className="text-xs text-gray-400">{formatDate(entry.timestamp)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-white">
                  {entry.type === "creation"
                    ? formatUSDC(BigInt(entry.amount))
                    : `${entry.type === "top_up" ? "+" : "-"}${formatUSDC(BigInt(entry.amount))}`}
                </p>
                <p className="text-xs text-gray-400 font-mono">
                  {truncateAddress(entry.txHash)}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
