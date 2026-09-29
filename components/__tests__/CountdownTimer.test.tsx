import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import CountdownTimer from "@/components/CountdownTimer";

describe("CountdownTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the expired label when endTime is in the past", () => {
    render(<CountdownTimer endTime={new Date("2025-12-31T23:59:00Z")} />);
    expect(screen.getByText("Ended")).toBeInTheDocument();
  });

  it("supports a custom expiredLabel", () => {
    render(<CountdownTimer endTime={new Date("2025-12-31T23:59:00Z")} expiredLabel="Stream ended" />);
    expect(screen.getByText("Stream ended")).toBeInTheDocument();
  });

  it("shows Ended and clears the interval at exactly endTime", () => {
    const clearSpy = vi.spyOn(globalThis, "clearInterval");
    render(<CountdownTimer endTime={new Date("2026-01-01T00:00:02Z")} />);
    expect(screen.getByRole("timer")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText("Ended")).toBeInTheDocument();
    expect(screen.queryByText(/-\d/)).not.toBeInTheDocument();
    expect(clearSpy).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
