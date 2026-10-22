"use client";

import { useState, useMemo } from "react";

/**
 * Health score ranges:
 *   green  (75–100): Healthy
 *   amber  (40–74):  Needs attention
 *   red    (0–39):   Critical
 */
export type HealthTier = "healthy" | "attention" | "critical";

export interface HealthScoreInput {
  /** Deposit remaining as a fraction (0–1). */
  depositRemainingRatio: number;
  /** Time remaining as a fraction (0–1) of total duration. */
  timeRemainingRatio: number;
  /** Number of past top-ups. More top-ups = lower score. */
  topUpCount: number;
}

/**
 * Compute a 0–100 health score based on:
 * - Deposit remaining (40% weight)
 * - Time remaining vs total duration (40% weight)
 * - Top-up history penalty (20% weight — more top-ups = lower score)
 */
export function calculateHealthScore(input: HealthScoreInput): number {
  const depositScore = Math.max(0, Math.min(1, input.depositRemainingRatio)) * 40;
  const timeScore = Math.max(0, Math.min(1, input.timeRemainingRatio)) * 40;

  // Top-up penalty: 0 top-ups = full 20, 3+ = 0
  const topUpPenalty = Math.min(input.topUpCount, 3);
  const topUpScore = Math.max(0, 20 - (topUpPenalty / 3) * 20);

  return Math.round(depositScore + timeScore + topUpScore);
}

export function getHealthTier(score: number): HealthTier {
  if (score >= 75) return "healthy";
  if (score >= 40) return "attention";
  return "critical";
}

const TIER_CLASSES: Record<HealthTier, string> = {
  healthy: "bg-green-100 dark:bg-green-900/60 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700",
  attention: "bg-yellow-100 dark:bg-yellow-900/60 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700",
  critical: "bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700",
};

const TIER_LABELS: Record<HealthTier, string> = {
  healthy: "Healthy",
  attention: "Needs Attention",
  critical: "At Risk",
};

interface StreamHealthBadgeProps {
  score: number;
  tier: HealthTier;
  depositRemainingRatio: number;
  timeRemainingRatio: number;
  topUpCount: number;
  /** When true, renders a compact chip. Default shows with label. */
  compact?: boolean;
}

export default function StreamHealthBadge({
  score,
  tier,
  depositRemainingRatio,
  timeRemainingRatio,
  topUpCount,
  compact = false,
}: StreamHealthBadgeProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const tooltipContent = useMemo(() => {
    const depositPct = Math.round(depositRemainingRatio * 100);
    const timePct = Math.round(timeRemainingRatio * 100);
    const topUpNote =
      topUpCount === 0
        ? "No top-ups needed"
        : `${topUpCount} top-up${topUpCount > 1 ? "s" : ""} recorded`;
    return `Deposit remaining: ${depositPct}% · Time remaining: ${timePct}% · ${topUpNote}`;
  }, [depositRemainingRatio, timeRemainingRatio, topUpCount]);

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${TIER_CLASSES[tier]}`}
        title={tooltipContent}
        aria-label={`Stream health: ${TIER_LABELS[tier]}, score ${score}/100`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            tier === "healthy"
              ? "bg-green-500"
              : tier === "attention"
                ? "bg-yellow-500"
                : "bg-red-500"
          }`}
          aria-hidden="true"
        />
        {score}
      </span>
    );
  }

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => setTooltipOpen((v) => !v)}
        onBlur={() => setTooltipOpen(false)}
        aria-expanded={tooltipOpen}
        aria-label={`Stream health: ${TIER_LABELS[tier]}, score ${score}/100. Click for details.`}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${TIER_CLASSES[tier]}`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            tier === "healthy"
              ? "bg-green-500 animate-pulse"
              : tier === "attention"
                ? "bg-yellow-500 animate-pulse"
                : "bg-red-500"
          }`}
          aria-hidden="true"
        />
        <span className="font-semibold">{score}/100</span>
        <span className="opacity-75">{TIER_LABELS[tier]}</span>
      </button>

      {tooltipOpen && (
        <div
          role="tooltip"
          className="absolute bottom-full left-0 mb-2 w-64 bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs text-gray-300 leading-relaxed z-20 shadow-xl"
        >
          <p className="font-medium text-white mb-1.5">Health Score Breakdown</p>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span>Deposit remaining</span>
              <span className="text-white font-mono">
                {Math.round(depositRemainingRatio * 100)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Time remaining</span>
              <span className="text-white font-mono">
                {Math.round(timeRemainingRatio * 100)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Top-ups recorded</span>
              <span className="text-white font-mono">{topUpCount}</span>
            </div>
            <div className="border-t border-gray-700 pt-1.5 mt-1.5 flex justify-between font-semibold">
              <span>Overall score</span>
              <span
                className={
                  tier === "healthy"
                    ? "text-green-400"
                    : tier === "attention"
                      ? "text-yellow-400"
                      : "text-red-400"
                }
              >
                {score}/100 — {TIER_LABELS[tier]}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
