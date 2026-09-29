/**
 * Shared time-remaining helpers used by CountdownTimer and StreamCard (#558).
 */

export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

/** Break the time until `endTime` into days / hours / minutes / seconds. */
export function computeRemaining(endTime: Date | string, now: number = Date.now()): TimeRemaining {
  const diff = new Date(endTime).getTime() - now;
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

function plural(value: number, singular: string, pluralForm = `${singular}s`): string {
  return `${value} ${value === 1 ? singular : pluralForm}`;
}

/**
 * Human-readable remaining time, e.g. "3 days 4 hrs remaining",
 * "5 hrs 12 min remaining" or "12 min remaining".
 * Returns null once `endTime` has passed.
 */
export function formatTimeRemaining(endTime: Date | string, now: number = Date.now()): string | null {
  const r = computeRemaining(endTime, now);
  if (r.expired) return null;
  if (r.days > 0) return `${plural(r.days, "day")} ${plural(r.hours, "hr")} remaining`;
  if (r.hours > 0) return `${plural(r.hours, "hr")} ${r.minutes} min remaining`;
  if (r.minutes > 0) return `${r.minutes} min remaining`;
  return "Less than a minute remaining";
}

/** Relative end time for finished streams, e.g. "Ended 2 days ago". */
export function formatEndedAgo(endTime: Date | string, now: number = Date.now()): string {
  const diffSeconds = Math.floor((now - new Date(endTime).getTime()) / 1000);
  if (diffSeconds < 60) return "Ended just now";
  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return `Ended ${plural(minutes, "min", "min")} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Ended ${plural(hours, "hr")} ago`;
  const days = Math.floor(hours / 24);
  return `Ended ${plural(days, "day")} ago`;
}
