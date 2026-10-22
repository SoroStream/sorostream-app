import { useMemo } from "react";
import en from "../locales/en.json";
import pt from "../locales/pt.json";
import es from "../locales/es.json";
import { useSettings } from "@/src/context/SettingsContext";

const translations: Record<string, typeof en> = {
  en,
  pt,
  es,
};

type Messages = typeof en;
type Namespace = keyof Messages;
type Key<N extends Namespace> = keyof Messages[N] & string;

// Per (language + namespace) cache of resolved keys, shared across all
// components. Avoids re-walking the messages object for keys that have
// already been resolved for the current locale, and lets `useTranslations`
// hand back a stable `t` reference (see below) instead of a brand-new
// closure on every render.
const resolvedKeyCache = new Map<string, string>();

function resolveKey<N extends Namespace>(
  language: string,
  namespace: N,
  key: Key<N>,
): string {
  const cacheKey = `${language}:${namespace}:${key}`;
  const cached = resolvedKeyCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const dict = translations[language] || translations["en"];
  const namespaceDict = dict[namespace] as Record<string, string> | undefined;
  const fallbackDict = translations["en"][namespace] as Record<string, string> | undefined;
  const raw = namespaceDict?.[key] ?? fallbackDict?.[key] ?? key;
  resolvedKeyCache.set(cacheKey, raw);
  return raw;
}

/**
 * Minimal locale-aware i18n hook — resolves keys from the messages file and supports
 * simple `{placeholder}}` interpolation, falling back to English if needed.
 *
 * The returned `t` function is memoized per (language, namespace) via `useMemo`
 * (#613): switching locale only produces a new `t` reference for consumers whose
 * language actually changed, instead of forcing every component that reads a
 * translation to re-render and re-resolve every key from scratch. Resolved
 * dictionary lookups are additionally cached in `resolvedKeyCache`.
 *
 * Usage:
 *   const t = useTranslations("dashboard");
 *   t("title")              // → "Dashboard"
 *   t("title", { id: "5" }) // → interpolated string
 *   t("common.active_stream_singular", { count: "1" }) // pluralization support
 */
export function useTranslations<N extends Namespace>(namespace: N) {
  let language = "en";
  try {
    const settings = useSettings();
    if (settings) language = settings.language;
  } catch {
    // fallback to "en" when context is not available (e.g. in tests)
  }

  return useMemo(() => {
    return function t(key: Key<N>, vars?: Record<string, string>): string {
      const raw = resolveKey(language, namespace, key);
      if (!vars) return raw;
      return Object.entries(vars).reduce(
        (str, [k, v]) => str.replaceAll(`{${k}}`, v),
        raw,
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, namespace]);
}