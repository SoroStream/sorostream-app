import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TopUpModal from "../TopUpModal";

function renderModal(onConfirm: (amount: string) => Promise<void>) {
  const utils = render(
    <TopUpModal
      open
      onClose={vi.fn()}
      onConfirm={onConfirm}
      token="USDC"
    />,
  );
  return utils;
}

const input = () => screen.getByLabelText("Amount (USDC)") as HTMLInputElement;

describe("TopUpModal", () => {
  it("renders the amount field empty when opened", () => {
    renderModal(vi.fn().mockResolvedValue(undefined));
    expect(input().value).toBe("");
  });

  it("clears the amount after a successful top-up and on re-open (#546)", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderModal(onConfirm);

    fireEvent.change(input(), { target: { value: "250.5" } });
    expect(input().value).toBe("250.5");

    fireEvent.click(screen.getByRole("button", { name: "Confirm Top-up" }));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith("250.5");
    });
    // Cleared as soon as the submission succeeds — the stale amount is never
    // carried over into the next open.
    await waitFor(() => {
      expect(input().value).toBe("");
    });

    // Re-opening starts from a blank field.
    rerender(
      <TopUpModal
        open
        onClose={vi.fn()}
        onConfirm={onConfirm}
        token="USDC"
      />,
    );
    expect(input().value).toBe("");
  });

  it("closes the modal after a successful top-up", async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <TopUpModal
        open
        onClose={onClose}
        onConfirm={onConfirm}
        token="USDC"
      />,
    );

    fireEvent.change(input(), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm Top-up" }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("keeps the amount and shows the error when the top-up fails", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("insufficient balance"));
    renderModal(onConfirm);

    fireEvent.change(input(), { target: { value: "42" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm Top-up" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("insufficient balance");
    });
    expect(input().value).toBe("42");
  });

  it("validates the amount before submitting", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    renderModal(onConfirm);

    fireEvent.click(screen.getByRole("button", { name: "Confirm Top-up" }));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
