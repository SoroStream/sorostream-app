/**
 * Format a fiat amount using the user's locale via Intl.NumberFormat.
 * Falls back to the browser's default locale when none is supplied, and to a
 * plain number string when the currency code itself is invalid.
 */
export function formatCurrency(
  amount: number,
  currency = "USD",
  locale?: string,
): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
  } catch {
    // The first attempt may fail because `locale` is invalid.  Try once more
    // with the browser's default locale.  If `currency` is itself the bad
    // argument, that second call would throw the same RangeError, so catch it
    // too and fall back to a plain number string.
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
    } catch {
      return amount.toString();
    }
  }
}
