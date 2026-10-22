"use client";

import { useEffect, useState, useCallback } from "react";

interface CollateralUnlockBadgeProps {
  /** The stream's end_time as an ISO string. */
  endTime: string;
  /** Grace period in seconds after endTime before collateral unlocks. Defaults to 0. */
  gracePeriodSeconds?: number;
  /** Whether the current user is the sender who locked collateral. */
  isSender: boolean;
  /** Whether collateral is actually held for this stream. */
  hasCollateral: boolean;
  /** Collateral amount in stroops (for display). */
  collateralStroops?: number;
  /** Called when user clicks the claim button. */
  onClaim?: () => void;
  /** Whether a claim transaction is in progress. */
  claiming?: boolean;
}

function computeUnlockRemaining(unlockTimeMs: number) {
  const diff = unlockTimeMs - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, unlocked: true };
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    unlocked: false,
  };
}

export default function CollateralUnlockBadge({
  endTime,
  gracePeriodSeconds = 0,
  isSender,
  hasCollateral,
  collateralStroops,
  onClaim,
  claiming = false,
}: CollateralUnlockBadgeProps) {
  const unlockTimeMs = new Date(endTime).getTime() + gracePeriodSeconds * 1000;
  const [remaining, setRemaining] = useState(() => computeUnlockRemaining(unlockTimeMs));
  const [pulse, setPulse] = useState(false);

  // Tick every second
  useEffect(() => {
    const interval = setInterval(() => {
      const next = computeUnlockRemaining(unlockTimeMs);
      setRemaining(next);
    }, 1000);
    return () => clearInterval(interval);
  }, [unlockTimeMs]);

  // Pulse animation when unlocked
  useEffect(() => {
    if (remaining.unlocked) {
      setPulse(true);
      const timeout = setTimeout(() => setPulse(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [remaining.unlocked]);

  // Don't render if no collateral or user is not the sender
  if (!hasCollateral || !isSender) {
    return null;
  }

  const collateralDisplay = collateralStroops
    ? (collateralStroops / 10_000_000).toFixed(2)
    : null;

  // Unlocked state
  if (remaining.unlocked) {
    return (
      <div
        className={`flex items-center gap-3 bg-green-900/40 border border-green-700/50 rounded-lg px-4 py-3 transition-all ${
          pulse ? "animate-pulse" : ""
        }`}
        role="status"
        aria-label="Collateral has been released"
      >
        <div className="flex-shrink-0">
          <svg
            className="h-6 w-6 text-green-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-green-300">Collateral Released</p>
          <p className="text-xs text-green-400/70">
            {collateralDisplay
              ? `${collateralDisplay} XLM available to claim`
              : "Your collateral is now available"}
          </p>
        </div>
        {onClaim && (
          <button
            onClick={onClaim}
            disabled={claiming}
            className="flex-shrink-0 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
          >
            {claiming ? "Claiming…" : "Claim"}
          </button>
        )}
      </div>
    );
  }

  // Countdown state
  const parts: { label: string; value: number }[] = [
    { label: "d", value: remaining.days },
    { label: "h", value: remaining.hours },
    { label: "m", value: remaining.minutes },
    { label: "s", value: remaining.seconds },
  ];

  return (
    <div
      className="bg-amber-900/30 border border-amber-700/40 rounded-lg px-4 py-3"
      role="status"
      aria-label="Collateral unlock countdown"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <svg
            className="h-5 w-5 text-amber-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-300">Collateral Locked</p>
          {collateralDisplay && (
            <p className="text-xs text-amber-400/70 mt-0.5">{collateralDisplay} XLM locked</p>
          )}
          <div className="flex items-center gap-2 mt-2 font-mono" aria-label="Time until unlock">
            {parts.map((p) => (
              <span key={p.label} className="flex items-baseline gap-0.5">
                <span className="text-lg font-bold tabular-nums text-amber-200">
                  {String(p.value).padStart(p.label === "d" ? 1 : 2, "0")}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-amber-400/60">
                  {p.label}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
