"use client";
/**
 * XlmPriceContext — shared XLM/USD price cache for the whole app (issue #582).
 *
 * Problem: each FiatDisplay instance previously called useXlmPrice() independently,
 * which caused N simultaneous price API requests when N FiatDisplay components were
 * mounted at once (e.g. 20 stream cards on the dashboard = 20 CoinGecko calls).
 *
 * Solution: a single provider fetches the price once per minute and all consumers
 * read from the shared context value. Zero duplicate network calls.
 *
 * Consumers can also call `refresh()` (issue #700) to pull a fresh price ahead of
 * the next scheduled tick, e.g. right before confirming a large transaction.
 * Manual refreshes reuse the single in-flight request and leave the automatic
 * interval untouched.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getXlmUsdPriceWithMeta } from "@/src/lib/xlmPrice";

/** How often the shared price is refreshed when the API is healthy (1 minute). */
const SHARED_REFRESH_INTERVAL_MS = 60 * 1_000;

/** Backoff after a rate-limited shared fetch (issue #726): 5 minutes after the
 * first 429, doubling on consecutive ones, capped at 30 minutes. Bounded so a
 * permanently rate-limited deployment still resumes fetching eventually. */
const RATE_LIMIT_BACKOFF_BASE_MS = 5 * 60 * 1_000;
const RATE_LIMIT_BACKOFF_MAX_MULTIPLE = 6;

interface XlmPriceContextValue {
  /** Latest XLM/USD price, or null when unavailable. */
  price: number | null;
  /** True only during the very first fetch (no price yet). */
  loading: boolean;
  /** True when the most recent attempt was refused by the price feeds (429). */
  rateLimited: boolean;
  /** True when a price is shown but the latest attempt to confirm it was
   * rate-limited — i.e. `price` is held over from before, not freshly checked. */
  stale: boolean;
  /**
   * Fetch the latest XLM/USD price immediately, ahead of the automatic tick.
   * Resolves once the shared value has been updated.
   */
  refresh: () => Promise<void>;
}

const XlmPriceContext = createContext<XlmPriceContextValue | undefined>(undefined);

export function XlmPriceProvider({ children }: { children: ReactNode }) {
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [rateLimited, setRateLimited] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  // Track whether the component is still mounted to avoid state updates after unmount.
  const cancelledRef = useRef(false);
  // Deduplicate concurrent fetches (manual refresh landing on the same tick as
  // the automatic refresh should not fire two requests).
  const inFlightRef = useRef<Promise<{ price: number | null; rateLimited: boolean }> | null>(
    null,
  );
  // Consecutive rate-limited attempts, for the doubling backoff below. Reset
  // to 0 on any successful (non-rate-limited) attempt.
  const consecutiveFailuresRef = useRef(0);
  // While backed off, automatic ticks land but are no-ops until this time —
  // the fixed interval below is never paused or rescheduled, so a manual
  // refresh (which always bypasses this gate) truly never disturbs it.
  const nextAllowedAutoAttemptAtRef = useRef(0);

  const fetchPrice = useCallback(async (force: boolean): Promise<void> => {
    if (inFlightRef.current) {
      await inFlightRef.current;
      return;
    }

    if (!force && Date.now() < nextAllowedAutoAttemptAtRef.current) {
      // Still backing off from a recent 429 — skip this automatic tick
      // entirely rather than hammering the feeds on the normal cadence.
      return;
    }

    const request = getXlmUsdPriceWithMeta({ force });
    inFlightRef.current = request;

    try {
      const { price: p, rateLimited: limited } = await request;
      if (!cancelledRef.current) {
        // A rate-limited attempt never overwrites a previously shown price
        // with null — the old price is kept, just flagged stale.
        if (!limited || p !== null) {
          setPrice(p);
        }
        setRateLimited(limited);
        setLoading(false);

        if (limited) {
          consecutiveFailuresRef.current += 1;
          const multiple = Math.min(
            2 ** (consecutiveFailuresRef.current - 1),
            RATE_LIMIT_BACKOFF_MAX_MULTIPLE,
          );
          nextAllowedAutoAttemptAtRef.current = Date.now() + RATE_LIMIT_BACKOFF_BASE_MS * multiple;
        } else {
          consecutiveFailuresRef.current = 0;
          nextAllowedAutoAttemptAtRef.current = 0;
          setLastUpdatedAt(Date.now());
        }
      }
    } finally {
      if (inFlightRef.current === request) inFlightRef.current = null;
    }
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    // Force a network fetch so a manual refresh never returns the stale cache.
    await fetchPrice(true);
  }, [fetchPrice]);

  useEffect(() => {
    cancelledRef.current = false;

    void fetchPrice(false);

    // The interval is created once per provider and never reset — a manual
    // refresh, or a backed-off automatic tick that no-ops, never restarts or
    // duplicates it. `fetchPrice` is stable, so this effect only runs once.
    const interval = setInterval(() => {
      void fetchPrice(false);
    }, SHARED_REFRESH_INTERVAL_MS);

    return () => {
      cancelledRef.current = true;
      clearInterval(interval);
    };
  }, [fetchPrice]);

  const stale = rateLimited && price !== null;

  const value = useMemo(
    () => ({ price, loading, rateLimited, stale, refresh }),
    [price, loading, rateLimited, stale, refresh],
  );

  return (
    <XlmPriceContext.Provider value={value}>{children}</XlmPriceContext.Provider>
  );
}

/**
 * Read the shared XLM/USD price.
 * Must be called inside a component tree wrapped by XlmPriceProvider.
 */
export function useSharedXlmPrice(): XlmPriceContextValue {
  const ctx = useContext(XlmPriceContext);
  if (ctx === undefined) {
    throw new Error("useSharedXlmPrice must be used within XlmPriceProvider");
  }
  return ctx;
}
