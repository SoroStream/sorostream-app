/**
 * @vitest-environment node
 *
 * Tests for src/lib/formatCurrency.ts (#855).
 *
 * Key scenario: when `currency` itself is an invalid ISO 4217 code the
 * original fallback re-used the same bad code, causing a second RangeError
 * that propagated uncaught. The fix wraps the fallback in its own try/catch
 * and returns `amount.toString()` as a last resort.
 */

import { formatCurrency } from "../src/lib/formatCurrency";

describe("formatCurrency", () => {
  it("formats a valid currency with a known locale", () => {
    const result = formatCurrency(1234.56, "USD", "en-US");
    // Basic smoke test — the exact format depends on the runtime's ICU data.
    expect(result).toContain("1,234.56");
    expect(result).toContain("$");
  });

  it("falls back to the browser locale when no locale is supplied", () => {
    // Should not throw and should include the numeric value.
    const result = formatCurrency(99, "EUR");
    expect(result).toMatch(/99/);
  });

  it("does not throw and returns the amount string when given an invalid currency code (#855)", () => {
    // "NOTACURRENCY" is not a valid ISO 4217 code and will make both
    // Intl.NumberFormat calls throw a RangeError.
    expect(() => formatCurrency(42, "NOTACURRENCY")).not.toThrow();
    expect(formatCurrency(42, "NOTACURRENCY")).toBe("42");
  });

  it("does not throw when locale is invalid but currency is valid", () => {
    // An invalid BCP-47 tag can cause the first call to throw; the fallback
    // (undefined locale, same valid currency) must succeed.
    expect(() => formatCurrency(10, "USD", "not-a-locale")).not.toThrow();
  });

  it("formats zero correctly", () => {
    const result = formatCurrency(0, "USD", "en-US");
    expect(result).toContain("0");
  });
});
