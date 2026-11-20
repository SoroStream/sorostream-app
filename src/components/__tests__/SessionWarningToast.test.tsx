import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionWarningToast } from "@/src/components/SessionWarningToast";

const mockWallet = {
  showSessionWarning5Min: false,
  sessionExpired: false,
  clearSessionExpired: vi.fn(),
  reconnect: vi.fn(),
};

vi.mock("@/src/context/WalletContext", () => ({
  useWallet: () => mockWallet,
}));

describe("SessionWarningToast", () => {
  beforeEach(() => {
    mockWallet.showSessionWarning5Min = false;
    mockWallet.sessionExpired = false;
    mockWallet.clearSessionExpired.mockReset();
    mockWallet.reconnect.mockReset();
  });

  it("still shows the session-expired toast after the 5-minute warning was dismissed (#885)", () => {
    mockWallet.showSessionWarning5Min = true;

    const { rerender } = render(<SessionWarningToast />);

    expect(screen.getByText("Wallet session expiring soon")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss session warning" }));

    expect(screen.queryByText("Wallet session expiring soon")).not.toBeInTheDocument();

    mockWallet.sessionExpired = true;
    rerender(<SessionWarningToast />);

    expect(screen.getByText("Wallet session expired")).toBeInTheDocument();
  });
});
