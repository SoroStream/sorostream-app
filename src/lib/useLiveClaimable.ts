"use client";

import { useEffect, useRef, useState } from "react";
import { claimableNow } from "@/src/lib/sorostream";

/** How often the claimable tooltip refreshes while stream details are visible. */
export const CLAIMABLE_REFRESH_MS = 5_000;

type ClaimableStream = Parameters<typeof claimableNow>[0];

/**
 * useLiveClaimable — live-polling hook for a stream's claimable balance.
 *
 * Returns the stream's current claimable amount (in stroops) and recomputes
 * it every `intervalMs` while `active` is true.
 *
 * Pass `active = false` (e.g. when the details modal is closed) to stop the
 * timer entirely so no updates happen in the background.
 *
 * ## Multi-instance safety
 *
 * This hook is designed to support **multiple concurrent instances**, each
 * polling a different stream independently. The hook holds no module-level
 * shared state — every call site gets its own `useState` and `useRef` scope,
 * and the underlying `claimableNow()` is a pure function with no side effects.
 *
 * This means you can safely mount two (or more) `useLiveClaimable` instances
 * in the same component tree (e.g. a details modal polling one stream while
 * a background list polls another) without interference:
 *
 * ```tsx
 * // Two concurrent instances — no shared state, no interference
 * const claimableA = useLiveClaimable(streamA, modalOpen);
 * const claimableB = useLiveClaimable(streamB, listVisible);
 * ```
 *
 * Each instance owns its own interval timer. Pausing one (via `active = false`)
 * does not affect the other.
 *
 * ## Current call site
 *
 * As of this writing, the only production consumer is `ClaimableTooltip.tsx`
 * (see `components/ClaimableTooltip.tsx`). A second real consumer (e.g. a
 * background list with live claimable updates) would exercise the multi-
 * instance path and is the scenario tested in `useLiveClaimable.test.tsx`.
 *
 * If a second consumer is added, update this note to list it here so the
 * real-world usage pattern stays documented alongside the test.
 */
export function useLiveClaimable(
  stream: ClaimableStream,
  active: boolean,
  intervalMs: number = CLAIMABLE_REFRESH_MS,
): number {
  const [claimable, setClaimable] = useState(() => Number(claimableNow(stream)));
  // Read the latest stream through a ref so parent re-renders with a new
  // object identity don't restart the timer.
  const streamRef = useRef(stream);
  streamRef.current = stream;
  // Track the live interval so rapid active toggling can never leave two running.
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const stop = () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    stop();
    if (!active) return;
    // Refresh immediately so a re-opened modal never shows a stale value.
    setClaimable(Number(claimableNow(streamRef.current)));
    intervalRef.current = setInterval(() => {
      setClaimable(Number(claimableNow(streamRef.current)));
    }, intervalMs);
    return stop;
  }, [active, intervalMs]);

  return claimable;
}
