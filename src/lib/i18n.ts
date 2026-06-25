import en from "../../messages/en.json";

type Messages = typeof en;
type Namespace = keyof Messages;
type Key<N extends Namespace> = keyof Messages[N] & string;

/**
 * Minimal i18n hook — resolves keys from the messages file and supports
 * simple `{placeholder}` interpolation.
 *
 * Usage:
 *   const t = useTranslations("dashboard");
 *   t("title")              // → "Dashboard"
 *   t("title", { id: "5" }) // → interpolated string
 */
export function useTranslations<N extends Namespace>(namespace: N) {
  return function t(key: Key<N>, vars?: Record<string, string>): string {
    const raw = (en[namespace] as Record<string, string>)[key] ?? key;
    if (!vars) return raw;
    return Object.entries(vars).reduce(
      (str, [k, v]) => str.replaceAll(`{${k}}`, v),
      raw
    );
  };
}
