"use client";
/**
 * AssetConversionPreview (#420)
 *
 * Shows the fiat-equivalent value of a streamed asset amount using the on-chain
 * price oracle (useOraclePrice) and the user's preferred fiat currency
 * (SettingsContext.preferredFiat). Used on the stream-creation form so users
 * see the real-world value of the amount they are about to stream.
 */
import { useOraclePrice } from "@/src/lib/useOraclePrice";
import { useSettings } from "@/src/context/SettingsContext";
import { useTranslations } from "@/src/lib/i18n";

interface AssetConversionPreviewProps {
  /** Amount expressed in the asset's native units (e.g. "12.5" USDC). */
  amount: string;
  /** Asset symbol, e.g. "USDC" or "XLM". */
  tokenSymbol: string;
}

export default function AssetConversionPreview({
  amount,
  tokenSymbol,
}: AssetConversionPreviewProps) {
  const t = useTranslations("common");
  const { showUsd, language, preferredFiat } = useSettings();
  const { price, loading } = useOraclePrice(tokenSymbol);

  if (!showUsd) return null;

  const num = parseFloat(amount);
  if (!amount || Number.isNaN(num) || num <= 0) return null;

  if (loading) return null;

  if (price === null) {
    return (
      <p
        className="text-xs text-gray-500 mt-1"
        aria-label={t("price_unavailable")}
      >
        ({t("price_unavailable")})
      </p>
    );
  }

  const fiat = num * price;
  const formatted = fiat.toLocaleString(language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <p
      className="text-xs text-gray-500 mt-1"
      aria-label={t("approximately_fiat", { formatted, currency: preferredFiat })}
    >
      (~{formatted} {preferredFiat})
    </p>
  );
}
