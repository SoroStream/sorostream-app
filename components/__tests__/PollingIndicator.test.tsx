import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PollingIndicator from "../PollingIndicator";

const LAST_REFRESH = Date.now();

/** Resolve on demand so the loading state can be observed mid-refresh. */
function deferred<T = void>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("PollingIndicator", () => {
  it("shows the idle copy when no refresh is running", () => {
    render(
      <PollingIndicator
        lastRefreshTime={LAST_REFRESH}
        onManualRefresh={vi.fn()}
      />,
    );

    expect(screen.getByTestId("polling-indicator")).toHaveAttribute(
      "data-state",
      "idle",
    );
    expect(
      screen.getByRole("button", { name: "Refresh now" }),
    ).toBeEnabled();
  });

  it("transitions idle -> loading -> idle after a manual refresh", async () => {
    const { promise, resolve } = deferred();
    const onManualRefresh = vi.fn(() => promise);

    render(
      <PollingIndicator
        lastRefreshTime={LAST_REFRESH}
        onManualRefresh={onManualRefresh}
      />,
    );

    const indicator = screen.getByTestId("polling-indicator");
    expect(indicator).toHaveAttribute("data-state", "idle");

    fireEvent.click(screen.getByRole("button", { name: "Refresh now" }));

    await waitFor(() => {
      expect(indicator).toHaveAttribute("data-state", "loading");
    });
    expect(screen.getByRole("button", { name: "Refreshing…" })).toBeDisabled();

    resolve();

    // The label must return to the idle copy once the refresh settles.
    await waitFor(() => {
      expect(indicator).toHaveAttribute("data-state", "idle");
    });
    expect(
      screen.getByRole("button", { name: "Refresh now" }),
    ).toBeEnabled();
    expect(onManualRefresh).toHaveBeenCalledTimes(1);
  });

  it("returns to the idle copy when the refresh rejects", async () => {
    const onManualRefresh = vi.fn(() => Promise.reject(new Error("rpc down")));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <PollingIndicator
        lastRefreshTime={LAST_REFRESH}
        onManualRefresh={onManualRefresh}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Refresh now" }));

    await waitFor(() => {
      expect(screen.getByTestId("polling-indicator")).toHaveAttribute(
        "data-state",
        "idle",
      );
    });
    expect(
      screen.getByRole("button", { name: "Refresh now" }),
    ).toBeEnabled();
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("reflects the parent-provided loading flag", () => {
    const { rerender } = render(
      <PollingIndicator
        lastRefreshTime={LAST_REFRESH}
        isLoading
        onManualRefresh={vi.fn()}
      />,
    );

    expect(screen.getByTestId("polling-indicator")).toHaveAttribute(
      "data-state",
      "loading",
    );

    rerender(
      <PollingIndicator
        lastRefreshTime={LAST_REFRESH}
        isLoading={false}
        onManualRefresh={vi.fn()}
      />,
    );

    expect(screen.getByTestId("polling-indicator")).toHaveAttribute(
      "data-state",
      "idle",
    );
  });

  it("hides the refresh button when no handler is provided", () => {
    render(<PollingIndicator lastRefreshTime={LAST_REFRESH} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
