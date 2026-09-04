/**
 * Returns the user's local timezone identifier (e.g. "America/New_York").
 * Safe to call in SSR – falls back to "UTC".
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

/**
 * Format an ISO timestamp (or Date) as a locale string with timezone
 * abbreviation in the user's local timezone.
 *
 * Example output: "Dec 31, 2025, 11:59 PM EST"
 */
export function formatDateWithTimezone(
  value: Date | string,
  locale: string = "en",
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);

  try {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(date);
  } catch {
    return date.toLocaleString(locale);
  }
}

/**
 * Format an ISO timestamp (or Date) as a short date with timezone
 * abbreviation. Suitable for compact UI (e.g. timeline labels).
 *
 * Example output: "Dec 31, 2025 EST"
 */
export function formatDateShortWithTimezone(
  value: Date | string,
  locale: string = "en",
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);

  try {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZoneName: "short",
    }).format(date);
  } catch {
    return date.toLocaleDateString(locale);
  }
}

/**
 * Returns the UTC representation of a timestamp for use as a hover tooltip
 * alongside a local-time display.
 *
 * Example output: "2025-12-31 23:59:00 UTC"
 */
export function formatDateUtc(
  value: Date | string,
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);

  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} UTC`
  );
}
// ---------------------------------------------------------------------------
// Timezone-aware datetime handling (#427)
// ---------------------------------------------------------------------------

/** Curated fallback list used when Intl.supportedValuesOf is unavailable. */
const COMMON_TIMEZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Africa/Lagos",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Bangkok",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Perth",
  "Australia/Sydney",
  "Pacific/Auckland",
] as const;

/** All IANA timezone names the runtime supports (plus a curated fallback). */
export function listTimezones(): string[] {
  const supported =
    typeof Intl !== "undefined" &&
    "supportedValuesOf" in Intl &&
    (() => {
      try {
        return (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone");
      } catch {
        return null;
      }
    })();

  if (supported && supported.length > 0) return [...supported];

  const zones = new Set<string>(COMMON_TIMEZONES);
  const userTz = getUserTimezone();
  if (userTz) zones.add(userTz);
  return Array.from(zones).sort();
}

/**
 * Offset in milliseconds that must be *added* to a UTC instant to get the
 * wall-clock time in `timeZone` at that moment (i.e. UTC − local, negated
 * like Date#getTimezoneOffset semantics but signed for direct arithmetic).
 */
export function getTimezoneOffsetMs(date: Date, timeZone: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(date);

    const map: Record<string, string> = {};
    for (const p of parts) map[p.type] = p.value;

    const wallAsUtc = Date.UTC(
      Number(map.year),
      Number(map.month) - 1,
      Number(map.day),
      Number(map.hour) % 24,
      Number(map.minute),
      Number(map.second),
    );
    return wallAsUtc - date.getTime();
  } catch {
    return 0;
  }
}

/**
 * Interpret a wall-clock time ("YYYY-MM-DDTHH:mm[:ss]") in the given IANA
 * timezone and return the corresponding absolute UTC instant.
 *
 * Uses a two-pass offset resolution so DST boundaries are handled correctly.
 * Returns null when the input is not a valid datetime-local string or the
 * timezone is unknown.
 */
export function zonedWallTimeToUtc(wallTime: string, timeZone: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(wallTime.trim());
  if (!m || !timeZone) return null;

  const [, y, mo, d, h, mi, s] = m;
  const naiveMs = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s ?? "0"));
  if (!Number.isFinite(naiveMs)) return null;

  // First pass: assume the offset at the naive instant is correct…
  const firstOffset = getTimezoneOffsetMs(new Date(naiveMs), timeZone);
  // …second pass: recompute using the offset at the corrected instant so
  // times that land on a DST transition resolve consistently.
  const secondOffset = getTimezoneOffsetMs(new Date(naiveMs - firstOffset), timeZone);
  if (firstOffset !== secondOffset && getTimezoneOffsetMs(new Date(naiveMs - secondOffset), timeZone) === firstOffset) {
    return new Date(naiveMs - firstOffset);
  }
  return new Date(naiveMs - secondOffset);
}

/**
 * Format an absolute instant as a datetime-local style wall-clock string
 * ("YYYY-MM-DDTHH:mm") in the given timezone — suitable as the value of an
 * <input type="datetime-local"> bound to that timezone.
 */
export function formatWallTimeInZone(date: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(date);

    const map: Record<string, string> = {};
    for (const p of parts) map[p.type] = p.value;

    const pad = (v: string) => v.padStart(2, "0");
    return `${map.year}-${pad(map.month)}-${pad(map.day)}T${pad(String(Number(map.hour) % 24))}:${pad(map.minute)}`;
  } catch {
    return date.toISOString().slice(0, 16);
  }
}
