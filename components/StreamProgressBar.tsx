"use client";

import { useMemo } from "react";
import type { StreamData } from "@/src/lib/sorostream";
import { getStreamedAmount } from "@/src/lib/sorostream";

interface StreamProgressBarProps {
  stream: StreamData;
}

type ProgressState = "not-started" | "active" | "completed";

export interface StreamProgress {
  /** Always a finite number clamped to [0, 100]. */
  percentage: number;
  /** Integer form of `percentage`, safe for `aria-valuenow`. */
  ariaValueNow: number;
  isCompleted: boolean;
  /** Lifecycle bucket, exposed for testing and styling. */
  state: ProgressState;
  elapsedText: string;
}

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

/**
 * Pure progress calculation, extracted so it can be unit-tested without
 * rendering (and so the rendered bar and its ARIA value can never diverge).
 *
 * Guarantees (#540):
 *  - not-yet-started streams report exactly 0% / `aria-valuenow="0"`
 *  - ended (or past-end) streams report exactly 100% / `aria-valuenow="100"`
 *  - malformed or missing timestamps degrade to 0 instead of producing
 *    `NaN` (which previously leaked into both `style.width` and the ARIA value)
 */
export function calculateStreamProgress(stream: StreamData, now: number = Date.now()): StreamProgress {
  const start = new Date(stream.startTime).getTime();
  const end = new Date(stream.endTime).getTime();

  const hasValidWindow = Number.isFinite(start) && Number.isFinite(end) && end > start;

  // For cancelled streams, the recipient only received what dripped before
  // cancellation — not the full deposit. Use the pro-rated streamed amount
  // so the bar reflects the actual net received.
  if (stream.status === "Cancelled") {
    const streamed = getStreamedAmount(stream);
    const pct = stream.deposit > 0 ? (streamed / stream.deposit) * 100 : 0;
    const percentage = clampPercentage(pct);
    return {
      percentage,
      ariaValueNow: Math.round(percentage),
      isCompleted: true,
      state: "completed",
      elapsedText: `${Math.round(percentage)}%`,
    };
  }

  if (!hasValidWindow) {
    // Unparseable/zero-length window: nothing measurable to report.
    return {
      percentage: 0,
      ariaValueNow: 0,
      isCompleted: false,
      state: "not-started",
      elapsedText: "0%",
    };
  }

  const totalDuration = end - start;

  // A stream that has not started yet is never "completed", regardless of
  // its status string, and must read as 0%.
  if (now < start) {
    return {
      percentage: 0,
      ariaValueNow: 0,
      isCompleted: false,
      state: "not-started",
      elapsedText: "0%",
    };
  }

  // Past the end (or explicitly Ended): report a full bar.
  if (stream.status === "Ended" || now >= end) {
    return {
      percentage: 100,
      ariaValueNow: 100,
      isCompleted: true,
      state: "completed",
      elapsedText: "100%",
    };
  }

  // Mid-stream: clamp so rounding can never produce 0 or 100 spuriously.
  const percentage = clampPercentage(((now - start) / totalDuration) * 100);

  return {
    percentage,
    ariaValueNow: Math.round(percentage),
    isCompleted: false,
    state: "active",
    elapsedText: `${Math.round(percentage)}%`,
  };
}

export default function StreamProgressBar({ stream }: StreamProgressBarProps) {
  const { percentage, ariaValueNow, isCompleted, state, elapsedText } = useMemo(
    () => calculateStreamProgress(stream),
    [stream],
  );

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-400">Progress</span>
        <span
          data-testid="progress-label"
          className={`font-medium ${isCompleted ? "text-green-400" : "text-white"}`}
        >
          {state === "not-started" ? "Not started" : isCompleted ? "Completed" : elapsedText}
        </span>
      </div>
      <div className="relative pt-1 pb-4">
        <div
          className="relative h-3 bg-gray-700 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={ariaValueNow}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={state === "not-started" ? "Not started" : `${elapsedText} elapsed`}
          aria-label={`Stream progress: ${elapsedText}`}
          data-progress-state={state}
        >
          <div
            data-testid="progress-fill"
            className={`h-full transition-all duration-500 ease-out ${
              isCompleted ? "bg-green-500" : "bg-green-600"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Milestone markers at 25%, 50%, 75% */}
        {[25, 50, 75].map((m) => {
          const reached = percentage >= m;
          return (
            <div
              key={m}
              data-testid={`milestone-marker-${m}`}
              data-reached={reached}
              className="absolute top-1 -translate-x-1/2 flex flex-col items-center pointer-events-none"
              style={{ left: `${m}%` }}
            >
              <div
                className={`w-1 h-3 rounded-full transition-colors ${
                  reached ? "bg-green-400 shadow-sm" : "bg-gray-500/70"
                }`}
              />
              <span
                className={`text-[10px] mt-0.5 font-mono font-medium transition-colors ${
                  reached ? "text-green-300 font-semibold" : "text-gray-500"
                }`}
              >
                {m}%
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-500">
        {state === "not-started"
          ? "This stream has not started yet"
          : isCompleted
            ? "Stream has finished"
            : `${elapsedText} of total duration elapsed`}
      </p>
    </div>
  );
}
