import { describe, expect, it } from "vitest";
import { formatLocaleDate, formatLocaleTime, formatLocaleDateTime } from "../dateFormat";

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

describe("formatLocaleTime", () => {
  it("formats a time using the given locale, not a fixed US layout", () => {
    const date = new Date("2025-06-01T13:05:00Z");
    const enFormatted = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(date);
    expect(formatLocaleTime(date, "en")).toBe(enFormatted);
  });

  it("respects a 24-hour-clock locale differently from en", () => {
    const date = new Date("2025-06-01T13:05:00Z");
    const de = formatLocaleTime(date, "de");
    const en = formatLocaleTime(date, "en");
    expect(de).not.toBe(en);
  });

  it("falls back to the raw value for an invalid time", () => {
    expect(formatLocaleTime("not-a-date", "en")).toBe("not-a-date");
  });
});

describe("formatLocaleDateTime", () => {
  it("combines date and time for the given locale", () => {
    const date = new Date("2025-12-31T13:05:00Z");
    const formatted = formatLocaleDateTime(date, "en");
    expect(formatted).toContain("2025");
  });

  it("falls back to the raw value for an invalid datetime", () => {
    expect(formatLocaleDateTime("not-a-date", "en")).toBe("not-a-date");
  });
});
