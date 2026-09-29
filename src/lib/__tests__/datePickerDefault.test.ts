import { describe, it, expect } from "vitest";
import { todayAsDate, nowAsDatetimeLocal, primePickerToNow } from "../datePickerDefault";

function input(type: string, extra: Partial<HTMLInputElement> = {}) {
  const el = document.createElement("input");
  el.type = type;
  Object.assign(el, extra);
  return el;
}

describe("datePickerDefault", () => {
  it("formats local date and datetime", () => {
    const d = new Date(2026, 0, 5, 7, 9);
    expect(todayAsDate(d)).toBe("2026-01-05");
    expect(nowAsDatetimeLocal(d)).toBe("2026-01-05T07:09");
  });

  it("seeds an empty date input with today and clears it on blur", () => {
    const el = input("date");
    primePickerToNow({ currentTarget: el });
    expect(el.value).toBe(todayAsDate());
    el.dispatchEvent(new Event("blur"));
    expect(el.value).toBe("");
  });

  it("does not overwrite an existing value", () => {
    const el = input("datetime-local", { value: "2030-01-01T10:00" });
    primePickerToNow({ currentTarget: el });
    expect(el.value).toBe("2030-01-01T10:00");
  });

  it("keeps the value when the user changed it", () => {
    const el = input("date");
    primePickerToNow({ currentTarget: el });
    el.dispatchEvent(new Event("change"));
    el.dispatchEvent(new Event("blur"));
    expect(el.value).toBe(todayAsDate());
  });
});
