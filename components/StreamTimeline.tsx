"use client";

interface StreamTimelineProps {
  startTime?: Date | string;
  endTime?: Date | string;
}

export default function StreamTimeline({ startTime = new Date(), endTime = new Date() }: StreamTimelineProps) {
  const now = Date.now();
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const progress = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
  const fmt = (d: Date | string) => new Date(d).toLocaleDateString();
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-gray-400">
        <span>{fmt(startTime)}</span>
        <span>Now</span>
        <span>{fmt(endTime)}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
