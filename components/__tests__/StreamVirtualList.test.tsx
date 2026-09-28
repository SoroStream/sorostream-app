import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import StreamVirtualList from "@/components/StreamVirtualList";
import { SettingsProvider } from "@/src/context/SettingsContext";
import type { StreamData } from "@/src/lib/sorostream";

vi.mock("@/src/context/BookmarksContext", () => ({
  useBookmarks: () => ({ bookmarkedIds: new Set(), isBookmarked: () => false, toggleBookmark: vi.fn() }),
}));

function createStream(id: number): StreamData {
  return {
    id: String(id),
    sender: `GBTESTSENDER${id}`,
    recipient: `GBTESTRECIP${id}`,
    flowRate: 1000000,
    deposit: 1000000000,
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 3600000).toISOString(),
    lastWithdrawTime: new Date().toISOString(),
    status: "Active",
    token: "XLM",
  };
}

describe("StreamVirtualList", () => {
  it("renders a virtualized list container with visible stream items", async () => {
    const streams = Array.from({ length: 30 }, (_, index) => createStream(index + 1));

    render(
      <SettingsProvider>
        <StreamVirtualList streams={streams} />
      </SettingsProvider>,
    );

    const list = screen.getByRole("list", { name: /stream list/i });
    expect(list).toBeInTheDocument();

    const items = await screen.findAllByRole("listitem");
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThan(streams.length);

    expect(screen.getByText(/^Stream #1$/i)).toBeInTheDocument();
  });

  it("moves DOM focus between stream cards with arrow keys (#616)", async () => {
    const streams = Array.from({ length: 6 }, (_, index) => createStream(index + 1));

    render(
      <SettingsProvider>
        <StreamVirtualList streams={streams} />
      </SettingsProvider>,
    );

    const links = await screen.findAllByRole("link");
    expect(links.length).toBeGreaterThan(1);

    links[0].focus();
    expect(document.activeElement).toBe(links[0]);

    fireEvent.keyDown(links[0], { key: "ArrowRight" });
    expect(document.activeElement).toBe(links[1]);

    fireEvent.keyDown(links[1], { key: "ArrowLeft" });
    expect(document.activeElement).toBe(links[0]);

    fireEvent.keyDown(links[0], { key: "ArrowDown" });
    expect(document.activeElement).toBe(links[2]);
  });
});
