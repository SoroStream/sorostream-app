"use client";
/**
 * Locale-aware date formatting helper (#628, extended for time in #632).
 *
 * Wraps Intl.DateTimeFormat and reuses the app's language preference
 * (SettingsContext — the same locale used by the language switcher /
 * useTranslations) instead of hardcoding a US-centric format, so
 * displayed dates match the user's selected locale rather than always
 * rendering as mm/dd/yyyy.
 */
import { useSettings } from "@/src/context/SettingsContext";

function toDate(value: Date | string): Date {
  return typeof value === "string" ? new Date(value) : value;
}

/** Format a date-only value using Intl.DateTimeFormat for the given locale. */
export function formatLocaleDate(
  value: Date | string,
  locale: string = "en",
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" },
): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return String(value);
  try {
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch {
    return date.toLocaleDateString(locale);
  }
}

/**
 * Format a time-only value using Intl.DateTimeFormat for the given locale
 * (#632) — e.g. renders as "1:05 PM" for en but "13:05" for locales that
 * default to a 24-hour clock, instead of always using the US format.
 */
export function formatLocaleTime(
  value: Date | string,
  locale: string = "en",
  options: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" },
): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return String(value);
  try {
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch {
    return date.toLocaleTimeString(locale);
  }
}

/** Format a combined date + time value using Intl.DateTimeFormat for the given locale. */
export function formatLocaleDateTime(
  value: Date | string,
  locale: string = "en",
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  },
): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return String(value);
  try {
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch {
    return date.toLocaleString(locale);
  }
}

/**
 * Hook returning locale-aware date/time formatters bound to the user's
 * selected app language (falls back to "en" outside SettingsProvider,
 * e.g. in tests). Shared by the #628 date fix and the #632 time fix so
 * both compose on the same locale source instead of duplicating it.
 */
export function useLocaleDateFormat() {
  let language = "en";
  try {
    const settings = useSettings();
    if (settings) language = settings.language;
  } catch {
    // fallback to "en" when context is not available (e.g. in tests)
  }

  return {
    formatDate: (value: Date | string, options?: Intl.DateTimeFormatOptions) =>
      formatLocaleDate(value, language, options),
    formatTime: (value: Date | string, options?: Intl.DateTimeFormatOptions) =>
      formatLocaleTime(value, language, options),
    formatDateTime: (value: Date | string, options?: Intl.DateTimeFormatOptions) =>
      formatLocaleDateTime(value, language, options),
  };
}
