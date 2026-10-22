import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StreamData } from "@/src/lib/sorostream";
import StreamCloneModal from "@/components/StreamCloneModal";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const pastStart = "2020-01-01T00:00:00.000Z";
const stream: StreamData = {
  id: "stream-past-start",
  sender: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  recipient: "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
  token: "USDC",
  deposit: 12_345_678_900,
  flowRate: 1000,
  startTime: pastStart,
  endTime: "2020-01-11T00:00:00.000Z",
  lastWithdrawTime: pastStart,
  status: "Ended",
};

describe("StreamCloneModal", () => {
  beforeEach(() => push.mockClear());

  it("carries clonable parameters forward and leaves the past start time behind", () => {
    const onClose = vi.fn();
    render(<StreamCloneModal stream={stream} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Clone Stream" }));

    expect(push).toHaveBeenCalledOnce();
    const url = new URL(push.mock.calls[0][0], "https://example.test");
    expect(url.pathname).toBe("/stream/new");
    expect(url.searchParams.get("recipient")).toBe(stream.recipient);
    expect(url.searchParams.get("amount")).toBe("1234.57");
    expect(url.searchParams.get("token")).toBe("USDC");
    expect(url.searchParams.get("duration")).toBe("864000");
    expect(url.searchParams.get("cliff")).toBe("0");
    expect(url.searchParams.has("startTime")).toBe(false);
    expect(url.searchParams.has("start_time")).toBe(false);
    expect(Date.parse(stream.endTime) - Date.parse(stream.startTime)).toBe(
      Number(url.searchParams.get("duration")) * 1000,
    );
    expect(onClose).toHaveBeenCalledOnce();
  });
});
