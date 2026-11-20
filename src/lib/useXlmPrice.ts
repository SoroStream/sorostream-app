"use client";
/**
 * useXlmPrice — fetches and caches the XLM/USD price on the client.
 *
 * Returns:
 *   { price: number | null, loading: boolean }
 *
 * `price` is null only when the feed is genuinely unreachable.
 * The hook re-fetches every 5 minutes to stay fresh.
 *
 * The mount/fetch/cancelled-flag/cleanup boilerplate is shared with
 * useOraclePrice via usePriceFeed (issue #893).
 */
import { getXlmUsdPrice } from "./xlmPrice";
import { usePriceFeed } from "./usePriceFeed";

const REFRESH_INTERVAL_MS = 5 * 60 * 1_000;

/**
 * Fetch the XLM/USD price and refresh it every 5 minutes.
 *
 * @returns {{ price: number | null; loading: boolean }} Latest price (`null` if unavailable) and loading flag.
 */
export function useXlmPrice(): { price: number | null; loading: boolean } {
  return usePriceFeed(getXlmUsdPrice, { intervalMs: REFRESH_INTERVAL_MS });
}
