import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SessionTimeoutModal } from "@/src/components/SessionTimeoutModal";

const mockWallet = {
  showSessionWarning1Min: false,
  sessionTimeRemaining: 60_000,
  extendSession: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock("@/src/context/WalletContext", () => ({
  useWallet: () => mockWallet,
}));

describe("SessionTimeoutModal", () => {
  it("stays mounted (display:none) instead of unmounting when closed (#615)", () => {
    mockWallet.showSessionWarning1Min = false;

    render(<SessionTimeoutModal />);

    const dialog = screen.getByRole("dialog", {
      name: /Session Expiring Soon/i,
      hidden: true,
    });
    expect(dialog.parentElement).toHaveClass("hidden");
    expect(dialog.parentElement).toHaveAttribute("aria-hidden", "true");
  });

  it("becomes visible (no hidden class, aria-hidden=false) when the warning is active", () => {
    mockWallet.showSessionWarning1Min = true;

    render(<SessionTimeoutModal />);

    const dialog = screen.getByRole("dialog", { name: /Session Expiring Soon/i });
    expect(dialog.parentElement).not.toHaveClass("hidden");
    expect(dialog.parentElement).toHaveAttribute("aria-hidden", "false");
  });
});
