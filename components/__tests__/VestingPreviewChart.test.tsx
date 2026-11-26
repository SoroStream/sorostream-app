import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import VestingPreviewChart from "@/components/VestingPreviewChart";

// ── Spy on calculateVestingSchedule so we can assert the options it receives ──
const mockCalculate = vi.fn();

vi.mock("@/src/lib/vestingSchedule", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/vestingSchedule")>();
  return {
    ...actual,
    calculateVestingSchedule: (
      ...args: Parameters<typeof actual.calculateVestingSchedule>
    ) => {
      mockCalculate(...args);
      return actual.calculateVestingSchedule(...args);
    },
  };
});

// ── theme stub ────────────────────────────────────────────────────────────────
vi.mock("@/src/lib/theme", () => ({
  useTheme: () => ({ theme: "dark" }),
}));

// ── recharts stub (avoid SVG/canvas errors in jsdom) ─────────────────────────
vi.mock("recharts", () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ReferenceLine: ({ label }: { label?: { value?: string } }) =>
    label?.value ? <span>{label.value}</span> : null,
  CartesianGrid: () => null,
}));

describe("VestingPreviewChart — cliffWindowSeconds passed to calculateVestingSchedule (#915)", () => {
  beforeEach(() => {
    mockCalculate.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it("passes cliffWindowSeconds when a valid cliff is provided", () => {
    render(
      <VestingPreviewChart
        amount="100"
        durationSeconds={3600}
        cliffSeconds={900}
      />,
    );

    expect(mockCalculate).toHaveBeenCalled();
    const optionsArg = mockCalculate.mock.calls[0][5];
    expect(optionsArg).toBeDefined();
    expect(typeof optionsArg.cliffWindowSeconds).toBe("number");
    expect(optionsArg.cliffWindowSeconds).toBeGreaterThan(0);
  });

  it("does not pass cliffWindowSeconds when no cliff is provided", () => {
    render(
      <VestingPreviewChart
        amount="100"
        durationSeconds={3600}
      />,
    );

    expect(mockCalculate).toHaveBeenCalled();
    const optionsArg = mockCalculate.mock.calls[0][5];
    // With no cliff the chart passes an empty options object.
    expect(optionsArg).toEqual({});
  });

  it("renders the cliff reference line and legend entry when a cliff is set", () => {
    render(
      <VestingPreviewChart
        amount="100"
        durationSeconds={3600}
        cliffSeconds={900}
      />,
    );

    expect(screen.getByText("Vesting Preview")).toBeInTheDocument();
    expect(screen.getByText("Cliff period ends here")).toBeInTheDocument();
    expect(screen.getByText("Cliff")).toBeInTheDocument();
  });
});

describe("VestingPreviewChart — invalid cliff (#937)", () => {
  afterEach(() => {
    cleanup();
  });
  it("silently treats cliffSeconds >= durationSeconds as no cliff, without a validation message", () => {
    render(
      <VestingPreviewChart
        amount="100"
        durationSeconds={1000}
        cliffSeconds={1000} // cliff at the very end: cliff >= duration
      />,
    );

    // The chart itself still renders (amount/duration are valid), it just
    // drops the cliff — it does not bail out and render nothing, and it
    // does not surface any validation/error message about the bad cliff.
    expect(screen.getByText("Vesting Preview")).toBeInTheDocument();
    expect(screen.queryByText("Cliff period ends here")).not.toBeInTheDocument();
    expect(screen.queryByText("Cliff Duration")).not.toBeInTheDocument();
    expect(screen.queryByText(/invalid/i)).not.toBeInTheDocument();
  });

  it("also drops the cliff when cliffSeconds is well past durationSeconds", () => {
    render(
      <VestingPreviewChart amount="100" durationSeconds={1000} cliffSeconds={5000} />,
    );

    expect(screen.getByText("Vesting Preview")).toBeInTheDocument();
    expect(screen.queryByText("Cliff period ends here")).not.toBeInTheDocument();
    expect(screen.queryByText("Cliff Duration")).not.toBeInTheDocument();
  });
});
