interface StreamCostCalculatorProps {
  /** Total stream amount as entered by the user (string from the input). */
  amount: string;
  /** Total stream duration in seconds. */
  durationSeconds: number;
  /** Token symbol to display alongside the amounts. */
  tokenSymbol: string;
}

const SECONDS_PER_DAY = 86400;

const HORIZONS = [
  { label: "1 day", seconds: SECONDS_PER_DAY },
  { label: "7 days", seconds: 7 * SECONDS_PER_DAY },
  { label: "30 days", seconds: 30 * SECONDS_PER_DAY },
] as const;

function formatAmount(value: number): string {
  if (!isFinite(value)) return "0";
  return value.toLocaleString(undefined, { maximumFractionDigits: 7 });
}

/**
 * Live cost projection shown while the user types the per-second rate
 * (derived from amount ÷ duration). Displays the implied per-second rate and
 * the total cost if the stream ran for 1, 7, and 30 days.
 */
export default function StreamCostCalculator({
  amount,
  durationSeconds,
  tokenSymbol,
}: StreamCostCalculatorProps) {
  const amountNum = parseFloat(amount) || 0;
  const perSecond = durationSeconds > 0 ? amountNum / durationSeconds : 0;
  const ready = amountNum > 0 && durationSeconds > 0;

  return (
    <div
      className="bg-gray-800/60 border border-gray-700 rounded-lg p-4 space-y-3"
      aria-label="Stream cost calculator"
    >
      <p className="text-sm font-medium text-gray-200">Cost projection</p>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">Rate per second</span>
        <span className="font-mono text-green-400">
          {ready ? formatAmount(perSecond) : "—"}{" "}
          <span className="text-gray-500">{tokenSymbol}/s</span>
        </span>
      </div>

      <div
        className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-700"
        role="list"
        aria-label="Total cost by time horizon"
      >
        {HORIZONS.map(({ label, seconds }) => (
          <div
            key={label}
            role="listitem"
            className="text-center bg-gray-900/60 rounded-lg p-2"
          >
            <p className="text-xs text-gray-400">{label}</p>
            <p className="font-mono text-white text-sm mt-1">
              {ready ? formatAmount(perSecond * seconds) : "—"}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">{tokenSymbol}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
