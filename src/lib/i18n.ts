import { createTranslator } from "next-intl";
import ar from "../locales/ar.json";
import he from "../locales/he.json";
import { useMemo } from "react";
import en from "../locales/en.json";
import pt from "../locales/pt.json";
import es from "../locales/es.json";
import { useSettings } from "@/src/context/SettingsContext";

const translations: Record<string, typeof en> = {
  en,
  pt,
  es,
  ar: { ...en, settings: { ...en.settings, ...ar.settings }, nav: { ...en.nav, ...ar.nav } },
  he: { ...en, settings: { ...en.settings, ...he.settings }, nav: { ...en.nav, ...he.nav } },
};

type Messages = typeof en;
type Namespace = keyof Messages;
type Key<N extends Namespace> = keyof Messages[N] & string;

/** next-intl translation adapter with English fallback and a stable function per locale. */
export function useTranslations<N extends Namespace>(namespace: N) {
  let language = "en";
  try {
    const settings = useSettings();
    if (settings) language = settings.language;
  } catch {
    // fallback to "en" when context is not available (e.g. in tests)
  }

  return useMemo(() => {
    const messages = (translations[language] || en)[namespace] as Record<string, string>;
    const t = createTranslator({ locale: language, messages });
    return (key: Key<N>, vars?: Record<string, string>): string => t(String(key), vars);
  }, [language, namespace]);
}
