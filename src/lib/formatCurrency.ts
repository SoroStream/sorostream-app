/**
 * Format a fiat amount using the user's locale via Intl.NumberFormat.
 * Falls back to the browser's default locale when none is supplied.
 */
export function formatCurrency(
  amount: number,
  currency = "USD",
  locale?: string,
): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
  } catch {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  }
}
