import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FlowRatePreview from "../FlowRatePreview";
import DurationPicker from "../DurationPicker";
import { XlmPriceProvider } from "@/src/context/XlmPriceContext";
import { SettingsProvider } from "@/src/context/SettingsContext";

describe("FlowRatePreview calculation logic (#47)", () => {
  it("computes per-second, per-hour, per-day, and per-month rates correctly", () => {
    // 100 USDC over 100 seconds
    render(
      <SettingsProvider>
        <XlmPriceProvider>
          <FlowRatePreview amount="100" durationSeconds={100} />
        </XlmPriceProvider>
      </SettingsProvider>,
    );

    // Per second: 100 / 100 = 1.0000000 USDC
    expect(screen.getByText(/1.0000000 USDC/)).toBeInTheDocument();

    // Per hour: 1 * 3600 = 3600.0000000 USDC
    expect(screen.getByText(/3600.0000000 USDC/)).toBeInTheDocument();

    // Per day: 1 * 86400 = 86400.0000000 USDC
    expect(screen.getByText(/86400.0000000 USDC/)).toBeInTheDocument();

    // Per month: 1 * 2592000 = 2592000.0000000 USDC
    expect(screen.getByText(/2592000.0000000 USDC/)).toBeInTheDocument();
  });

  it("handles fractional rates and 7 decimal precision correctly", () => {
    // 1 USDC over 86400 seconds (1 day)
    render(
      <SettingsProvider>
        <XlmPriceProvider>
          <FlowRatePreview amount="1" durationSeconds={86400} />
        </XlmPriceProvider>
      </SettingsProvider>,
    );

    // 1 / 86400 ≈ 0.00001157407... -> 0.0000116
    expect(screen.getByText(/0.0000116 USDC/)).toBeInTheDocument();
    // 1 / 24 ≈ 0.0416667 USDC per hour
    expect(screen.getByText(/0.0416667 USDC/)).toBeInTheDocument();
    // 1 USDC per day
    expect(screen.getByText(/1.0000000 USDC/)).toBeInTheDocument();
    // 30 USDC per month
    expect(screen.getByText(/30.0000000 USDC/)).toBeInTheDocument();
  });

  it("returns null for invalid, zero, or negative inputs", () => {
    const { container: c1 } = render(<FlowRatePreview amount="0" durationSeconds={3600} />);
    expect(c1).toBeEmptyDOMElement();

    const { container: c2 } = render(<FlowRatePreview amount="-10" durationSeconds={3600} />);
    expect(c2).toBeEmptyDOMElement();

    const { container: c3 } = render(<FlowRatePreview amount="abc" durationSeconds={3600} />);
    expect(c3).toBeEmptyDOMElement();

    const { container: c4 } = render(<FlowRatePreview amount="100" durationSeconds={0} />);
    expect(c4).toBeEmptyDOMElement();
  });
});

describe("DurationPicker conversion logic (#47)", () => {
  it("converts mixed days, hours, minutes to seconds correctly", async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<DurationPicker onChange={handleChange} />);

    const daysInput = screen.getByLabelText("Days");
    const hoursInput = screen.getByLabelText("Hours");
    const minutesInput = screen.getByLabelText("Minutes");

    // Enter 2 days, 3 hours, 45 minutes
    // 2 * 86400 + 3 * 3600 + 45 * 60 = 172800 + 10800 + 2700 = 186300 seconds
    await user.clear(daysInput);
    await user.type(daysInput, "2");
    await user.clear(hoursInput);
    await user.type(hoursInput, "3");
    await user.clear(minutesInput);
    await user.type(minutesInput, "45");

    expect(handleChange).toHaveBeenLastCalledWith(186300);
  });

  it("handles fractional day conversions (e.g. 0.5 days = 43200 seconds)", async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<DurationPicker onChange={handleChange} />);

    const daysInput = screen.getByLabelText("Days");
    await user.clear(daysInput);
    await user.type(daysInput, "0.5");

    expect(handleChange).toHaveBeenLastCalledWith(43200);
  });

  it("initializes from initialSeconds correctly", () => {
    const handleChange = vi.fn();
    // 90060 seconds = 1 day (86400) + 1 hour (3600) + 1 minute (60)
    render(<DurationPicker onChange={handleChange} initialSeconds={90060} />);

    expect(screen.getByLabelText("Days")).toHaveValue(1.042361111111111);
    expect(screen.getByLabelText("Hours")).toHaveValue(1);
    expect(screen.getByLabelText("Minutes")).toHaveValue(1);
    expect(handleChange).toHaveBeenCalledWith(90060);
  });
});
