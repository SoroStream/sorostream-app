"use client";
/**
 * FiatDisplay — shows a USD equivalent for an XLM amount.
 *
 * - Fetches XLM/USD from CoinGecko (5-minute cache via useXlmPrice).
 * - Respects the user's "showUsd" setting from SettingsContext.
 * - Shows "Price unavailable" gracefully when the feed is unreachable.
 * - Renders nothing while loading the first price to avoid layout shift.
 *
 * Props:
 *   xlmAmount  — the amount in XLM (human-readable, not stroops).
 *
 * @example
 *   <FiatDisplay xlmAmount={12.5} />
 *   // renders: (~$1.56 USD)
 */
import { useXlmPrice } from "@/src/lib/useXlmPrice";
import { useSettings } from "@/src/context/SettingsContext";

interface FiatDisplayProps {
  /** Amount expressed in XLM (not stroops). */
  xlmAmount?: number;
  /** Amount expressed in USDC. */
  usdcAmount?: number;
}

export default function FiatDisplay({ xlmAmount, usdcAmount }: FiatDisplayProps) {
  const { price, loading } = useXlmPrice();
  const { showUsd } = useSettings();

  if (!showUsd) return null;

  if (usdcAmount !== undefined) {
    const formatted = usdcAmount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return (
      <span
        className="text-gray-400 text-xs ml-1"
        aria-label={`approximately ${formatted} US dollars`}
      >
        (~${formatted} USD)
      </span>
    );
  }

  if (xlmAmount !== undefined) {
    if (loading) return null; // avoid layout shift on first load

    if (price === null) {
      return (
        <span className="text-gray-500 text-xs ml-1" aria-label="Price unavailable">
          (Price unavailable)
        </span>
      );
    }

    const usd = xlmAmount * price;
    const formatted = usd.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return (
      <span
        className="text-gray-400 text-xs ml-1"
        aria-label={`approximately ${formatted} US dollars`}
      >
        (~${formatted} USD)
      </span>
    );
  }

  return null;
}
