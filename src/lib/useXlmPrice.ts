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
 * ─── PREFER useSharedXlmPrice() / XlmPriceContext FOR NEW CODE ───────────────
 *
 * This hook exists for standalone components that cannot be wrapped by
 * XlmPriceProvider (e.g. lightweight embeds, Storybook stories, or unit tests
 * that mount a component in isolation). For every other use-case, use
 * `useSharedXlmPrice()` from `src/context/XlmPriceContext.tsx` instead.
 *
 * Key differences:
 *
 *  - Deduplication: XlmPriceContext shares a single price fetch across all
 *    consumers in the same React tree. Each instance of this hook fires its
 *    own independent request, so N mounted components = N simultaneous API
 *    calls (issue #582 is why XlmPriceContext was introduced).
 *
 *  - Rate-limit backoff (issue #726): XlmPriceContext backs off exponentially
 *    after receiving a 429 from the price feed (5 min → 10 min → … → 30 min
 *    cap). This hook has no such logic and will continue hammering the feed on
 *    its fixed 5-minute interval even when it is being rate-limited.
 *
 *  - Stale-price tracking: XlmPriceContext exposes `stale` and `rateLimited`
 *    flags so the UI can distinguish "price unknown" from "price held over from
 *    a previous successful fetch". This hook only surfaces `price` and
 *    `loading`, hiding that distinction.
 *
 *  - Manual refresh: XlmPriceContext's `refresh()` lets a consumer force an
 *    immediate re-fetch (e.g. before confirming a large transaction) without
 *    duplicating the in-flight automatic tick. This hook has no equivalent.
 *
 * In short: any component rendered inside the main application shell already
 * has XlmPriceProvider in its ancestor tree and should call
 * `useSharedXlmPrice()`. Reach for this hook only when that provider is
 * genuinely absent from the component's render context.
 */
import { useEffect, useState } from "react";
import { getXlmUsdPrice } from "./xlmPrice";

const REFRESH_INTERVAL_MS = 5 * 60 * 1_000;

/**
 * Fetch the XLM/USD price and refresh it every 5 minutes.
 *
 * @returns {{ price: number | null; loading: boolean }} Latest price (`null` if unavailable) and loading flag.
 */
export function useXlmPrice(): { price: number | null; loading: boolean } {
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const p = await getXlmUsdPrice();
      if (!cancelled) {
        setPrice(p);
        setLoading(false);
      }
    }

    void refresh();

    const interval = setInterval(() => {
      void refresh();
    }, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { price, loading };
}
