"use client";

import { useId } from "react";
import { formatStellarAmount, type StreamData } from "@/src/lib/sorostream";
import { useLiveClaimable, CLAIMABLE_REFRESH_MS } from "@/src/lib/useLiveClaimable";

interface ClaimableTooltipProps {
  stream: StreamData;
  /** Whether the stream details are currently visible. Updates stop when false. */
  active: boolean;
  label: string;
  intervalMs?: number;
}

/**
 * Info trigger with a tooltip showing the stream's claimable amount.
 * The value is recomputed every 5 seconds while `active` is true so it
 * reflects real-time balance growth instead of a cached snapshot.
 */
export default function ClaimableTooltip({
  stream,
  active,
  label,
  intervalMs = CLAIMABLE_REFRESH_MS,
}: ClaimableTooltipProps) {
  const tooltipId = useId();
  const claimable = useLiveClaimable(stream, active, intervalMs);
  const display = formatStellarAmount(claimable);

  return (
    <span className="relative group inline-flex items-center gap-1">
      <span className="text-sm font-mono tabular-nums">{display}</span>
      <button
        type="button"
        aria-label={label}
        aria-describedby={tooltipId}
        className="text-gray-500 hover:text-gray-300 text-xs border border-gray-600 rounded-full w-4 h-4 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
      >
        ?
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        data-testid={`claimable-tooltip-${stream.id}`}
        className="hidden group-hover:block group-focus-within:block absolute left-0 bottom-6 w-56 bg-gray-700 border border-gray-600 rounded-lg p-2 text-xs text-gray-300 z-10 shadow-lg"
      >
        {label}: <span className="font-mono">{display}</span>
      </span>
    </span>
  );
}
