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
 * Hook returning locale-aware date formatters bound to the user's
 * selected app language (falls back to "en" outside SettingsProvider,
 * e.g. in tests).
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
  };
}
