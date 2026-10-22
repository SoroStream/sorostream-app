import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import StreamProgressBar, { calculateStreamProgress } from "../StreamProgressBar";
import type { StreamData } from "@/src/lib/sorostream";

const now = Date.now();

const SAMPLE_STREAM: StreamData = {
  id: "1",
  sender: "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ",
  recipient: "GB7B2XS7YYUWVLXUYG6EWBEYHV4WTUY5VWFDOXWOITVNHAJBMMRV7ZGO",
  deposit: 1000000000,
  flowRate: 100,
  startTime: new Date(now - 60000).toISOString(), // 60s ago
  endTime: new Date(now + 40000).toISOString(),   // 40s in future -> 60% elapsed
  lastWithdrawTime: new Date(now - 60000).toISOString(),
  status: "Active",
  token: "USDC",
};

/** Stream that starts 2 days in the future (issue #482 regression guard). */
const FUTURE_STREAM: StreamData = {
  id: "9",
  sender: "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ",
  recipient: "GB7B2XS7YYUWVLXUYG6EWBEYHV4WTUY5VWFDOXWOITVNHAJBMMRV7ZGO",
  deposit: 6000000000,
  flowRate: 600000,
  startTime: new Date(now + 86400000 * 2).toISOString(), // starts in 2 days
  endTime: new Date(now + 86400000 * 12).toISOString(),  // ends in 12 days
  lastWithdrawTime: new Date(now + 86400000 * 2).toISOString(),
  status: "Active",
  token: "USDC",
};

/** Stream whose end is 2 days in the past. */
const ENDED_STREAM: StreamData = {
  ...SAMPLE_STREAM,
  id: "10",
  status: "Ended",
  startTime: new Date(now - 86400000 * 12).toISOString(),
  endTime: new Date(now - 86400000 * 2).toISOString(),
  lastWithdrawTime: new Date(now - 86400000 * 2).toISOString(),
};

/** Status still says "Active" but the window has already elapsed. */
const PAST_END_STREAM: StreamData = {
  ...SAMPLE_STREAM,
  id: "11",
  status: "Active",
  startTime: new Date(now - 86400000 * 12).toISOString(),
  endTime: new Date(now - 86400000 * 2).toISOString(),
  lastWithdrawTime: new Date(now - 86400000 * 2).toISOString(),
};

function buildStream(overrides: Partial<StreamData>): StreamData {
  return { ...SAMPLE_STREAM, ...overrides };
}

/** Percentage width of the inner fill, read from the inline style. */
function fillWidth(): number {
  return Number.parseFloat(
    (screen.getByTestId("progress-fill") as HTMLElement).style.width,
  );
}

describe("StreamProgressBar Milestones", () => {
  it("renders 25%, 50%, and 75% milestone markers on the progress bar track", () => {
    render(<StreamProgressBar stream={SAMPLE_STREAM} />);

    const m25 = screen.getByTestId("milestone-marker-25");
    const m50 = screen.getByTestId("milestone-marker-50");
    const m75 = screen.getByTestId("milestone-marker-75");

    expect(m25).toBeInTheDocument();
    expect(m50).toBeInTheDocument();
    expect(m75).toBeInTheDocument();

    expect(m25).toHaveTextContent("25%");
    expect(m50).toHaveTextContent("50%");
    expect(m75).toHaveTextContent("75%");
  });

  it("marks reached milestones (25% and 50%) as reached when percentage is ~60%", () => {
    render(<StreamProgressBar stream={SAMPLE_STREAM} />);

    const m25 = screen.getByTestId("milestone-marker-25");
    const m50 = screen.getByTestId("milestone-marker-50");
    const m75 = screen.getByTestId("milestone-marker-75");

    expect(m25.getAttribute("data-reached")).toBe("true");
    expect(m50.getAttribute("data-reached")).toBe("true");
    expect(m75.getAttribute("data-reached")).toBe("false");
  });
});

// ── Issue #482: future streams must show 0% progress ─────────────────────────
describe("StreamProgressBar future-stream clamping (#482)", () => {
  it("shows 0% progress for a stream that has not started yet", () => {
    render(<StreamProgressBar stream={FUTURE_STREAM} />);

    // The progress bar aria-valuenow should be 0
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("0");
  });

  it("does not mark any milestone as reached for a future stream", () => {
    render(<StreamProgressBar stream={FUTURE_STREAM} />);

    const m25 = screen.getByTestId("milestone-marker-25");
    const m50 = screen.getByTestId("milestone-marker-50");
    const m75 = screen.getByTestId("milestone-marker-75");

    expect(m25.getAttribute("data-reached")).toBe("false");
    expect(m50.getAttribute("data-reached")).toBe("false");
    expect(m75.getAttribute("data-reached")).toBe("false");
  });
});

// ── Issue #540: width and aria-valuenow must never diverge ──────────────────
describe("StreamProgressBar pre-start / mid-stream / post-end (#540)", () => {
  it("renders a 0% bar with aria-valuenow=0 for a not-yet-started stream", () => {
    render(<StreamProgressBar stream={FUTURE_STREAM} />);

    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "0");
    expect(bar).toHaveAttribute("data-progress-state", "not-started");
    expect(fillWidth()).toBe(0);
    expect(screen.getByTestId("progress-label")).toHaveTextContent(/not started/i);
  });

  it("renders a mid-stream bar with matching width and aria-valuenow", () => {
    render(<StreamProgressBar stream={SAMPLE_STREAM} />);

    const bar = screen.getByRole("progressbar");
    const value = Number(bar.getAttribute("aria-valuenow"));
    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThan(100);
    expect(bar).toHaveAttribute("data-progress-state", "active");

    // The rendered width and the announced value must never diverge.
    const width = fillWidth();
    expect(width).toBeGreaterThan(0);
    expect(width).toBeLessThan(100);
    expect(Math.round(width)).toBe(value);
  });

  it("renders a 100% bar with aria-valuenow=100 for an ended stream", () => {
    render(<StreamProgressBar stream={ENDED_STREAM} />);

    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "100");
    expect(bar).toHaveAttribute("data-progress-state", "completed");
    expect(fillWidth()).toBe(100);
  });

  it("renders a 100% bar for a stream whose end time has passed but status is still Active", () => {
    render(<StreamProgressBar stream={PAST_END_STREAM} />);

    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "100");
    expect(bar).toHaveAttribute("data-progress-state", "completed");
    expect(fillWidth()).toBe(100);
  });

  it("never emits NaN for a malformed start/end window", () => {
    const progress = calculateStreamProgress(
      buildStream({ startTime: "not-a-date", endTime: "not-a-date" }),
    );
    expect(progress.percentage).toBe(0);
    expect(progress.ariaValueNow).toBe(0);
    expect(Number.isNaN(progress.ariaValueNow)).toBe(false);
  });

  it("never emits NaN when the end time precedes the start time", () => {
    const progress = calculateStreamProgress(
      buildStream({
        startTime: new Date(now).toISOString(),
        endTime: new Date(now - 1000).toISOString(),
      }),
    );
    expect(progress.percentage).toBe(0);
    expect(progress.ariaValueNow).toBe(0);
  });
});

describe("calculateStreamProgress (#540)", () => {
  const start = Date.UTC(2026, 0, 1);
  const end = Date.UTC(2026, 0, 11); // 10 days

  it("returns 0% strictly before the start time", () => {
    const p = calculateStreamProgress(
      buildStream({
        startTime: new Date(start).toISOString(),
        endTime: new Date(end).toISOString(),
      }),
      start - 1,
    );
    expect(p.percentage).toBe(0);
    expect(p.ariaValueNow).toBe(0);
    expect(p.state).toBe("not-started");
    expect(p.isCompleted).toBe(false);
  });

  it("returns 50% at the exact midpoint", () => {
    const p = calculateStreamProgress(
      buildStream({
        startTime: new Date(start).toISOString(),
        endTime: new Date(end).toISOString(),
      }),
      start + (end - start) / 2,
    );
    expect(p.ariaValueNow).toBe(50);
    expect(p.state).toBe("active");
  });

  it("returns 100% at the exact end time", () => {
    const p = calculateStreamProgress(
      buildStream({
        startTime: new Date(start).toISOString(),
        endTime: new Date(end).toISOString(),
      }),
      end,
    );
    expect(p.percentage).toBe(100);
    expect(p.ariaValueNow).toBe(100);
    expect(p.state).toBe("completed");
  });

  it("returns 100% well after the end time", () => {
    const p = calculateStreamProgress(
      buildStream({
        startTime: new Date(start).toISOString(),
        endTime: new Date(end).toISOString(),
      }),
      end + 999_999,
    );
    expect(p.percentage).toBe(100);
    expect(p.ariaValueNow).toBe(100);
  });

  it("keeps a cancelled stream pinned to its pro-rated streamed amount", () => {
    const cancelled = buildStream({
      status: "Cancelled",
      deposit: 1000,
      startTime: new Date(start).toISOString(),
      endTime: new Date(end).toISOString(),
      lastWithdrawTime: new Date(start).toISOString(),
    });
    const p = calculateStreamProgress(cancelled, start + (end - start) / 4);
    expect(p.state).toBe("completed");
    expect(p.isCompleted).toBe(true);
    expect(p.percentage).toBeGreaterThanOrEqual(0);
    expect(p.percentage).toBeLessThanOrEqual(100);
  });
});

