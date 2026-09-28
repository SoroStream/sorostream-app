"use client";

import { useEffect, useRef, useState } from "react";

interface CountdownTimerProps {
  endTime: Date | string;
  /** Label rendered once the countdown reaches zero. */
  expiredLabel?: string;
}

function computeRemaining(endTime: Date | string) {
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    expired: false,
  };
}

export default function CountdownTimer({ endTime, expiredLabel = "Ended" }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(() => computeRemaining(endTime));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function stopInterval() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    function recalculate() {
      const next = computeRemaining(endTime);
      setRemaining(next);
      // Stop ticking as soon as the countdown reaches zero.
      if (next.expired) stopInterval();
      return next;
    }

    function startInterval() {
      stopInterval();
      intervalRef.current = setInterval(recalculate, 1000);
    }

    // Recalculate immediately then start ticking.
    if (!recalculate().expired) startInterval();

    // When the tab becomes visible again after being backgrounded, the browser
    // may have throttled the interval — recalculate elapsed time immediately
    // using Date.now() rather than relying on accumulated ticks.
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        if (!recalculate().expired) startInterval();
      } else {
        // Stop ticking while the tab is hidden to prevent drift accumulation.
        stopInterval();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopInterval();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [endTime]);

  if (remaining.expired) {
    return (
      <div className="text-center">
        <p className="text-gray-400 text-sm mb-1">Time Remaining</p>
        <p className="text-red-400 font-mono text-lg font-semibold">{expiredLabel}</p>
      </div>
    );
  }

  const parts: { label: string; value: number }[] = [
    { label: "days", value: remaining.days },
    { label: "hrs", value: remaining.hours },
    { label: "min", value: remaining.minutes },
    { label: "sec", value: remaining.seconds },
  ];

  return (
    <div className="text-center">
      <p className="text-gray-400 text-sm mb-2">Time Remaining</p>
      <div className="flex items-center justify-center gap-3 font-mono" role="timer" aria-label="Time remaining">
        {parts.map((p, i) => (
          <span key={p.label} className="flex flex-col items-center">
            <span className="text-2xl sm:text-3xl font-bold tabular-nums text-green-400">
              {String(p.value).padStart(2, "0")}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-gray-400">{p.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
