import LiveCounter from "./LiveCounter";

interface StreamCardProps {
  stream: Stream;
}

const STATUS_STYLES: Record<Stream["status"], string> = {
  Active: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
  Completed: "bg-slate-100 text-slate-700",
};

/**
 * Card displaying a stream summary: sender/recipient, flow rate,
 * progress bar, live claimable badge, and status chip.
 */
export default function StreamCard({ stream }: StreamCardProps) {
  const now = Math.floor(Date.now() / 1000);
  const total = stream.endTime - stream.startTime;
  const elapsed = Math.min(now - stream.startTime, total);
  const pct = total > 0 ? Math.round((elapsed / total) * 100) : 0;
  const perDay = stream.flowRate * 86_400n;

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[stream.status]}`}>
          {stream.status}
        </span>
        <span className="text-xs text-slate-400 font-mono">#{stream.id}</span>
      </div>

      <div className="text-sm space-y-1">
        <p className="text-slate-500">
          From <span className="font-mono text-slate-800">{stream.sender.slice(0, 6)}…{stream.sender.slice(-4)}</span>
        </p>
        <p className="text-slate-500">
          To <span className="font-mono text-slate-800">{stream.recipient.slice(0, 6)}…{stream.recipient.slice(-4)}</span>
        </p>
      </div>

      <p className="text-sm text-slate-600">
        <span className="font-semibold">{formatUSDC(perDay)}</span> USDC/day
      </p>

      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-sky-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-slate-400">{pct}% complete</p>

      {stream.status === "Active" && (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm">
          <span className="text-slate-600">Claimable: </span>
          <LiveCounter
            initialStroops={stream.flowRate * BigInt(Math.max(0, now - stream.lastWithdrawTime))}
            flowRatePerSecond={stream.flowRate}
            endTime={stream.endTime}
          />
        </div>
      )}
    </article>
  );
}
