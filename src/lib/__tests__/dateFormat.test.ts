import { describe, expect, it } from "vitest";
import { formatLocaleDate } from "../dateFormat";

describe("formatLocaleDate", () => {
  it("formats a date using the given locale instead of a fixed mm/dd/yyyy layout", () => {
    const date = new Date("2025-12-31T12:00:00Z");
    expect(formatLocaleDate(date, "en")).toBe("Dec 31, 2025");
  });

  it("respects a non-English locale", () => {
    const date = new Date("2025-01-05T12:00:00Z");
    const formatted = formatLocaleDate(date, "de");
    // German month formatting differs from the US mm/dd/yyyy layout.
    expect(formatted).not.toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}$/);
  });

  it("accepts an ISO string as well as a Date", () => {
    expect(formatLocaleDate("2025-12-31T12:00:00Z", "en")).toBe("Dec 31, 2025");
  });

  it("falls back to the raw value for an invalid date", () => {
    expect(formatLocaleDate("not-a-date", "en")).toBe("not-a-date");
  });
});
