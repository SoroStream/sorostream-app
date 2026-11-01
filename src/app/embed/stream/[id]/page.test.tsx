/**
 * Embed stream widget tests (issue #779).
 *
 * The embed layout (src/app/embed/layout.tsx) deliberately excludes
 * NavHeader, AppFooter, and WalletConnect so the widget can be iframed by
 * third-party sites without leaking the host app's chrome. This page itself
 * never imports those components, so rendering it directly is enough to
 * confirm none of them sneak in.
 */
import { render, screen, waitFor, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { StreamData } from "@/src/lib/sorostream";

const mockGetStream = vi.fn<(id: string) => Promise<StreamData | null>>();
const mockGetMockStream = vi.fn<(id: string) => StreamData | null>();

vi.mock("@/src/lib/sorostream", () => ({
  sorostream: { getStream: (id: string) => mockGetStream(id) },
  getMockStream: (id: string) => mockGetMockStream(id),
  claimableNow: () => 1_000_0000,
}));

import EmbedStreamPage from "./page";

const stream: StreamData = {
  id: "42",
  sender: "GSENDER",
  recipient: "GRECIPIENT",
  token: "USDC",
  flowRate: 10,
  deposit: 1_000,
  startTime: new Date(Date.now() - 1_000).toISOString(),
  endTime: new Date(Date.now() + 1_000_000).toISOString(),
  lastWithdrawTime: new Date().toISOString(),
  status: "Active",
};

beforeEach(() => {
  mockGetMockStream.mockReturnValue(null);
  mockGetStream.mockResolvedValue(stream);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("Embed stream widget isolation and rendering (#779)", () => {
  it("does not render NavHeader, AppFooter, or wallet-connect UI", async () => {
    render(<EmbedStreamPage params={{ id: "42" }} />);
    await waitFor(() => {
      expect(screen.getByRole("region")).toBeInTheDocument();
    });

    expect(document.querySelector("header")).toBeNull();
    expect(document.querySelector("footer")).toBeNull();
    expect(
      screen.queryByRole("button", { name: /connect.*wallet/i })
    ).toBeNull();
  });

  it("renders the stream's core status once loaded", async () => {
    render(<EmbedStreamPage params={{ id: "42" }} />);

    await waitFor(() => {
      expect(screen.getByText(/Stream #42/)).toBeInTheDocument();
    });
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("shows a not-found state when the stream does not exist", async () => {
    mockGetStream.mockResolvedValue(null);

    render(<EmbedStreamPage params={{ id: "missing" }} />);

    await waitFor(() => {
      expect(screen.getByText(/not found/i)).toBeInTheDocument();
    });
  });
});
