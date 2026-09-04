import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NewStreamPage from "@/src/app/stream/new/page";

// Mock router
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock wallet context
vi.mock("@/src/context/WalletContext", () => ({
  useWallet: () => ({
    address: "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ",
    isConnecting: false,
    error: null,
  }),
}));

// Mock preferences context
vi.mock("@/src/context/PreferencesContext", () => ({
  usePreferences: () => ({
    defaultToken: "USDC",
    defaultDuration: 3600,
    defaultCliffDuration: 0,
  }),
}));

// Mock settings context
vi.mock("@/src/context/SettingsContext", () => ({
  useSettings: () => ({
    streamThreshold: 10000,
  }),
}));

// Mock address verification to enable instant step advancement
vi.mock("@/src/lib/addressVerification", () => ({
  verifyAddress: vi.fn().mockResolvedValue({ status: "verified" }),
  canCreateStream: () => true,
}));

describe("Wallet Balance Top-Up Prompt Flow", () => {
  beforeEach(() => {
    localStorage.clear();
    delete (window as unknown as Record<string, unknown>).__MOCK_WALLET_BALANCE__;
  });

  it("shows top-up banner with correct shortfall and disables submit button when balance is insufficient", async () => {
    // Set initial mock balance to 100
    (window as unknown as Record<string, unknown>).__MOCK_WALLET_BALANCE__ = 100;

    render(<NewStreamPage />);

    // Step 1: Recipient step
    const recipientInput = screen.getByTestId("recipient-input");
    fireEvent.change(recipientInput, {
      target: { value: "GB7B2XS7YYUWVLXUYG6EWBEYHV4WTUY5VWFDOXWOITVNHAJBMMRV7ZGO" },
    });

    const nextBtn = screen.getByRole("button", { name: "Next" });
    await waitFor(() => expect(nextBtn).toBeEnabled());
    fireEvent.click(nextBtn);

    // Step 2: Amount step - enter 600 USDC (shortfall = 500)
    await waitFor(() => expect(screen.getByLabelText(/amount/i)).toBeInTheDocument());
    const amountInput = screen.getByLabelText(/amount/i);
    fireEvent.change(amountInput, { target: { value: "600" } });

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    // Step 3: Preview step -> Click Confirm
    await waitFor(() => expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    // Step 4: Review step
    await waitFor(() => {
      expect(screen.getByTestId("top-up-banner")).toBeInTheDocument();
    });

    expect(screen.getByText(/insufficient balance/i)).toBeInTheDocument();
    expect(screen.getByTestId("shortfall-amount")).toHaveTextContent("500");

    // Submit button should be disabled
    const submitBtn = screen.getByTestId("confirm-sign-button");
    expect(submitBtn).toBeDisabled();

    // Now update mock balance to 700 (sufficient)
    (window as unknown as Record<string, unknown>).__MOCK_WALLET_BALANCE__ = 700;
    fireEvent(
      window,
      new CustomEvent("mock-balance-update", { detail: 700 }),
    );

    // Banner should dismiss and submit button should enable
    await waitFor(() => {
      expect(screen.queryByTestId("top-up-banner")).not.toBeInTheDocument();
      expect(submitBtn).not.toBeDisabled();
    });
  });

  it("shows no top-up banner when initial balance is sufficient", async () => {
    (window as unknown as Record<string, unknown>).__MOCK_WALLET_BALANCE__ = 1000;

    render(<NewStreamPage />);

    // Step 1: Recipient step
    const recipientInput = screen.getByTestId("recipient-input");
    fireEvent.change(recipientInput, {
      target: { value: "GB7B2XS7YYUWVLXUYG6EWBEYHV4WTUY5VWFDOXWOITVNHAJBMMRV7ZGO" },
    });

    const nextBtn = screen.getByRole("button", { name: "Next" });
    await waitFor(() => expect(nextBtn).toBeEnabled());
    fireEvent.click(nextBtn);

    // Step 2: Amount step - enter 300 USDC (balance 1000 is sufficient)
    await waitFor(() => expect(screen.getByLabelText(/amount/i)).toBeInTheDocument());
    const amountInput = screen.getByLabelText(/amount/i);
    fireEvent.change(amountInput, { target: { value: "300" } });

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    // Step 3: Preview step
    await waitFor(() => expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    // Step 4: Review step - No banner should appear
    await waitFor(() => {
      expect(screen.getByTestId("confirm-sign-button")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("top-up-banner")).not.toBeInTheDocument();
    expect(screen.getByTestId("confirm-sign-button")).not.toBeDisabled();
  });
});
