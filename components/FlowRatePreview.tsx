"use client";
import { toStroops, calculateFlowRate } from "@/src/lib/sorostream";


interface FlowRatePreviewProps {
  /** USDC amount as a decimal string (e.g. "100"). */
  amount: string;
  /** Total duration in seconds. */
  durationSeconds: number;
}

/**
 * Displays per-second, per-hour, per-day, and per-month flow rate
 * breakdown as the user types amount and duration.
 */
export default function FlowRatePreview({ amount, durationSeconds }: FlowRatePreviewProps) {
  if (!amount || durationSeconds <= 0) return null;

  let perSecond: bigint;
  try {
    const stroops = toStroops(amount);
    perSecond = calculateFlowRate(stroops, durationSeconds);
  } catch {
    return null;
  }

  const perHour = perSecond * 3600n;
  const perDay = perSecond * 86_400n;
  const perMonth = perSecond * 2_592_000n;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
      <p className="mb-2 font-medium text-slate-700">Flow Rate</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
        {[
          ["Per second", perSecond],
          ["Per hour", perHour],
          ["Per day", perDay],
          ["Per month", perMonth],
        ].map(([label, val]) => (
          <div key={label as string} className="contents">
            <dt className="text-slate-500">{label}</dt>
            <dd className="font-mono text-slate-800">{formatUSDC(val as bigint)} USDC</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
