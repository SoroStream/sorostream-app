import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { StreamData } from "@/src/lib/sorostream";
import StreamComparisonModal from "@/components/StreamComparisonModal";

vi.mock("@/components/FederationName", () => ({
  default: ({ address }: { address: string }) => <span>{address}</span>,
}));
vi.mock("@/components/ClaimableTooltip", () => ({
  default: () => <span>Claimable amount</span>,
}));

function makeStream(overrides: Partial<StreamData> = {}): StreamData {
  return {
    id: "stream-current-0000000000000001",
    sender: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    recipient: "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
    token: "USDC",
    decimals: 7,
    flowRate: 10_000,
    deposit: 100_000_000,
    startTime: "2025-01-01T00:00:00.000Z",
    endTime: "2025-01-11T00:00:00.000Z",
    lastWithdrawTime: "2025-01-01T00:00:00.000Z",
    status: "Active",
    ...overrides,
  };
}

async function selectStream(current: StreamData, selected: StreamData) {
  render(
    <StreamComparisonModal
      open
      onClose={vi.fn()}
      currentStream={current}
      availableStreams={[current, selected]}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: /select a stream to compare/i }));
  fireEvent.click(screen.getByRole("button", { name: new RegExp(selected.id.slice(0, 16)) }));
  return screen.findByText("Amount", { exact: true });
}

describe("StreamComparisonModal amount units", () => {
  it("labels amounts with each token when decimal precision differs", async () => {
    const current = makeStream({ token: "USDC", decimals: 6, deposit: 100_000_000 });
    const compared = makeStream({
      id: "stream-compared-0000000000000002",
      token: "ASSET7",
      decimals: 7,
      deposit: 100_000_000,
    });
    await selectStream(current, compared);

    const amountLabel = screen.getByText("Amount", { exact: true });
    const row = amountLabel.parentElement!;
    expect(within(row).getByText("10.0000000 USDC")).toBeInTheDocument();
    expect(within(row).getByText("10.0000000 ASSET7")).toBeInTheDocument();
  });

  it("keeps same-token amounts labeled consistently", async () => {
    const current = makeStream({ token: "USDC", deposit: 100_000_000 });
    const compared = makeStream({
      id: "stream-compared-0000000000000002",
      token: "USDC",
      deposit: 200_000_000,
    });
    await selectStream(current, compared);

    const row = screen.getByText("Amount", { exact: true }).parentElement!;
    expect(within(row).getByText("10.0000000 USDC")).toBeInTheDocument();
    expect(within(row).getByText("20.0000000 USDC")).toBeInTheDocument();
  });
});
