import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PullToRefresh from "@/components/PullToRefresh";
import StreamVirtualList from "@/components/StreamVirtualList";
import type { StreamData } from "@/src/lib/sorostream";

vi.mock("@/components/StreamCard", () => ({ default: () => <div>Stream card</div> }));

function makeStreams(): StreamData[] {
  return Array.from({ length: 30 }, (_, i) => ({
    id: String(i), sender: `sender${i}`, recipient: `recipient${i}`, token: "XLM",
    flowRate: 1, deposit: 100, startTime: new Date().toISOString(), endTime: new Date(Date.now() + 100000).toISOString(),
    lastWithdrawTime: new Date().toISOString(), status: "Active" as const,
  }));
}

describe("PullToRefresh", () => {
  it("renders children correctly", () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(
      <PullToRefresh onRefresh={onRefresh}>
        <div>Stream List Content</div>
      </PullToRefresh>
    );

    expect(screen.getByText("Stream List Content")).toBeInTheDocument();
    expect(screen.getByTestId("pull-to-refresh-container")).toBeInTheDocument();
  });

  it("handles touch events and triggers refresh past threshold", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(
      <PullToRefresh onRefresh={onRefresh}>
        <div>Stream List Content</div>
      </PullToRefresh>
    );

    const container = screen.getByTestId("pull-to-refresh-container");

    fireEvent.touchStart(container, { touches: [{ clientY: 50 }] });
    fireEvent.touchMove(container, { touches: [{ clientY: 200 }] });
    fireEvent.touchEnd(container);

    expect(onRefresh).toHaveBeenCalled();
  });

  it("does not refresh when the page is scrolled down", () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window, "scrollY", { value: 300, configurable: true });
    render(
      <PullToRefresh onRefresh={onRefresh}>
        <div>Stream List Content</div>
      </PullToRefresh>
    );
    const container = screen.getByTestId("pull-to-refresh-container");
    fireEvent.touchStart(container, { touches: [{ clientY: 50 }] });
    fireEvent.touchMove(container, { touches: [{ clientY: 200 }] });
    fireEvent.touchEnd(container);
    expect(onRefresh).not.toHaveBeenCalled();
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
  });

  it("does not refresh when released before the threshold", () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(
      <PullToRefresh onRefresh={onRefresh}>
        <div>Stream List Content</div>
      </PullToRefresh>
    );
    const container = screen.getByTestId("pull-to-refresh-container");
    fireEvent.touchStart(container, { touches: [{ clientY: 50 }] });
    fireEvent.touchMove(container, { touches: [{ clientY: 80 }] });
    fireEvent.touchEnd(container);
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("refreshes from the top of a virtualized dashboard and leaves in-list scroll alone", () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(<PullToRefresh onRefresh={onRefresh}><StreamVirtualList streams={makeStreams()} /></PullToRefresh>);
    const shell = screen.getByTestId("pull-to-refresh-container");
    const list = screen.getByTestId("stream-list");
    fireEvent.touchStart(list, { touches: [{ clientY: 20 }] });
    fireEvent.touchMove(list, { touches: [{ clientY: 180 }] });
    fireEvent.touchEnd(list);
    expect(onRefresh).toHaveBeenCalledTimes(1);

    onRefresh.mockClear();
    Object.defineProperty(list, "scrollTop", { value: 120, writable: true, configurable: true });
    fireEvent.touchStart(list, { touches: [{ clientY: 20 }] });
    fireEvent.touchMove(list, { touches: [{ clientY: 180 }] });
    fireEvent.touchEnd(list);
    expect(onRefresh).not.toHaveBeenCalled();
    expect(shell).toContainElement(list);
  });
});
