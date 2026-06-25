"use client";

const USDC_TO_USD_RATE = 1;

export default function FiatDisplay({ usdcAmount }: { usdcAmount: number }) {
  const fiatValue = usdcAmount * USDC_TO_USD_RATE;
  return (
    <span className="text-gray-400 text-sm">
      ≈ ${fiatValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
}
