/**
 * #782 — Assert that StreamDryRunPreview renders exactly the checkpoints
 * described by DRY_RUN_PROGRESS_MARKERS from streamDryRun.ts.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * StreamDryRunPreview.tsx renders a table row for each checkpoint returned by
 * simulateStreamDryRun(), which in turn uses DRY_RUN_PROGRESS_MARKERS as its
 * default set of progress points. Nothing previously verified that the
 * rendered row count and progress labels actually matched that constant —
 * a developer could silently add a hardcoded marker list inside the component
 * (the same class of duplication already found in VestingChart.tsx) with no
 * test catching the drift.
 *
 * Strategy
 * --------
 * 1. Render StreamDryRunPreview with a known amount/duration.
 * 2. Wait for the simulated async delay (600 ms in the component) to resolve.
 * 3. Assert:
 *    a. The table has exactly DRY_RUN_PROGRESS_MARKERS.length rows.
 *    b. Each row's "Point" cell label matches the corresponding marker's
 *       fmtProgress output (Start / End / percentage string).
 *    c. The marker array itself is what streamDryRun.ts exports (guards
 *       against someone editing the constant but forgetting to update tests).
 */

import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import StreamDryRunPreview from "../StreamDryRunPreview";
import { DRY_RUN_PROGRESS_MARKERS } from "@/src/lib/streamDryRun";

// ---------------------------------------------------------------------------
// Helpers that mirror StreamDryRunPreview's own fmtProgress function so we
// can derive the expected row labels without coupling to the implementation.
// ---------------------------------------------------------------------------
function fmtProgress(progress: number): string {
  if (progress === 0) return "Start";
  if (progress === 1) return "End";
  return `${Math.round(progress * 100)}%`;
}

// ---------------------------------------------------------------------------
// Setup — fake timers so we can advance past the 600 ms async delay inside
// StreamDryRunPreview without waiting in wall-clock time.
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("StreamDryRunPreview checkpoint / DRY_RUN_PROGRESS_MARKERS drift (#782)", () => {
  /**
   * Guard the shape of DRY_RUN_PROGRESS_MARKERS itself. If someone edits the
   * constant, this assertion surfaces the change clearly instead of letting
   * the later row-count check produce a confusing diff.
   */
  it("DRY_RUN_PROGRESS_MARKERS has the expected values [0, 0.25, 0.5, 0.75, 1]", () => {
    expect(Array.from(DRY_RUN_PROGRESS_MARKERS)).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });

  it("renders exactly one row per DRY_RUN_PROGRESS_MARKERS entry", async () => {
    render(
      <StreamDryRunPreview
        amount="100"
        durationSeconds={86400}
        feeBasisPoints={50}
        active
      />,
    );

    // Advance past the component's 600 ms simulated dry-run delay.
    await act(async () => {
      vi.advanceTimersByTime(650);
    });

    const rows = screen
      .getByRole("table", { name: /simulated stream checkpoints/i })
      .querySelectorAll("tbody tr");

    expect(rows).toHaveLength(DRY_RUN_PROGRESS_MARKERS.length);
  });

  it("each row's Point cell matches the DRY_RUN_PROGRESS_MARKERS entry for that position", async () => {
    render(
      <StreamDryRunPreview
        amount="100"
        durationSeconds={86400}
        feeBasisPoints={50}
        active
      />,
    );

    await act(async () => {
      vi.advanceTimersByTime(650);
    });

    const rows = Array.from(
      screen
        .getByRole("table", { name: /simulated stream checkpoints/i })
        .querySelectorAll("tbody tr"),
    );

    expect(rows).toHaveLength(DRY_RUN_PROGRESS_MARKERS.length);

    rows.forEach((row, idx) => {
      const marker = DRY_RUN_PROGRESS_MARKERS[idx];
      const expectedLabel = fmtProgress(marker);
      // The first <td> in each row is the "Point" cell.
      const pointCell = row.querySelectorAll("td")[0];
      expect(
        pointCell?.textContent,
        `Row ${idx}: expected Point cell to be "${expectedLabel}" ` +
          `(marker=${marker}) but got "${pointCell?.textContent}". ` +
          `If DRY_RUN_PROGRESS_MARKERS changed, update fmtProgress in this test to match.`,
      ).toBe(expectedLabel);
    });
  });

  it("renders no checkpoint rows while still loading", () => {
    render(
      <StreamDryRunPreview
        amount="100"
        durationSeconds={86400}
        active
      />,
    );

    // Timer has not been advanced — component is still in loading state.
    const table = screen.queryByRole("table", { name: /simulated stream checkpoints/i });
    expect(table).toBeNull();

    // The loading skeleton must be present instead.
    expect(screen.getByRole("status", { name: /running dry-run simulation/i })).toBeTruthy();
  });
});
