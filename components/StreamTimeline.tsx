"use client";


interface StreamTimelineProps {
  stream: Stream;
}

/**
 * Visual timeline showing stream created → now → end date with progress indicator.
 */
export default function StreamTimeline({ stream }: StreamTimelineProps) {
  const now = Math.floor(Date.now() / 1000);
  const total = stream.endTime - stream.startTime;
  const elapsed = Math.min(now - stream.startTime, total);
  const pct = total > 0 ? Math.round((elapsed / total) * 100) : 0;

  const fmt = (ts: number) =>
    new Date(ts * 1000).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-slate-500">
        <span>Created {fmt(stream.startTime)}</span>
        <span>Ends {fmt(stream.endTime)}</span>
      </div>
      <div
        className="relative h-3 rounded-full bg-slate-200 overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Stream progress: ${pct}%`}
      >
        <div
          className="h-full rounded-full bg-sky-500 transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-center text-xs text-slate-500">{pct}% elapsed</p>
    </div>
  );
}
