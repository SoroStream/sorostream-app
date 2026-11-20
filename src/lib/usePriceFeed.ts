"use client";
/**
 * usePriceFeed — generic single-source-of-truth for the cancelled-flag /
 * loading-state / async-refresh / cleanup pattern shared by useXlmPrice and
 * useOraclePrice (issue #893).
 *
 * Both hooks are identical structurally: they own a `price` state, a
 * `loading` state, and a `useEffect` that:
 *   1. Declares a `cancelled` flag to guard against stale `setState` after
 *      unmount (the standard React async-safety idiom).
 *   2. Calls an async `fetch` function and writes the result to state if the
 *      component is still mounted.
 *   3. Optionally schedules a repeated refresh via `setInterval`.
 *   4. Cleans up — sets `cancelled = true` and clears the interval — on
 *      unmount or dependency change.
 *
 * Extracting this into a single hook means the cancellation-safety behaviour
 * is implemented and tested once.
 *
 * @example
 * // Drop-in replacement inside useXlmPrice:
 * export function useXlmPrice() {
 *   return usePriceFeed(getXlmUsdPrice, { intervalMs: REFRESH_INTERVAL_MS });
 * }
 *
 * // Drop-in replacement inside useOraclePrice:
 * export function useOraclePrice(token: string) {
 *   return usePriceFeed(() => getOraclePrice(token), { deps: [token] });
 * }
 */

import { useEffect, useState } from "react";

export interface UsePriceFeedOptions {
  /**
   * How often to re-fetch after the initial call, in milliseconds.
   * Omit (or pass 0) for a one-shot fetch that only re-runs when `deps` change.
   */
  intervalMs?: number;
  /**
   * Additional React dependencies that trigger a fresh fetch when they change.
   * Defaults to `[]` (fetch once on mount).
   */
  deps?: React.DependencyList;
}

export interface PriceFeedResult {
  price: number | null;
  loading: boolean;
}

/**
 * Generic price-feed hook.
 *
 * @param fetchFn - Async function that resolves to a price (`number`) or
 *   `null` when the source is unavailable.
 * @param options - Optional polling interval and extra dependencies.
 * @returns `{ price, loading }` — `loading` is `true` only until the first
 *   fetch completes, regardless of whether a price was obtained.
 */
export function usePriceFeed(
  fetchFn: () => Promise<number | null>,
  options: UsePriceFeedOptions = {},
): PriceFeedResult {
  const { intervalMs = 0, deps = [] } = options;

  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const p = await fetchFn();
      if (!cancelled) {
        setPrice(p);
        setLoading(false);
      }
    }

    void refresh();

    const interval =
      intervalMs > 0
        ? setInterval(() => {
            void refresh();
          }, intervalMs)
        : undefined;

    return () => {
      cancelled = true;
      if (interval !== undefined) clearInterval(interval);
    };
    // `fetchFn` is intentionally excluded from deps: callers that need
    // re-fetch on data changes should pass a stable function reference or
    // use the `deps` option. Including an inline arrow function here would
    // cause an infinite re-fetch loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { price, loading };
}
