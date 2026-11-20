import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import NetworkSelector from "@/components/NetworkSelector";
import { NetworkProvider } from "@/src/lib/network";

describe("NetworkSelector", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("updates aria-label synchronously in the same render pass as the label when clicked (#894)", () => {
    render(
      <NetworkProvider>
        <NetworkSelector />
      </NetworkProvider>,
    );

    const button = screen.getByRole("button");
    expect(button).toHaveTextContent("Testnet");
    expect(button).toHaveAttribute(
      "aria-label",
      "Network: testnet. Click to switch to mainnet",
    );

    fireEvent.click(button);

    expect(button).toHaveTextContent("Mainnet");
    expect(button).toHaveAttribute(
      "aria-label",
      "Network: mainnet. Click to switch to testnet",
    );

    fireEvent.click(button);

    expect(button).toHaveTextContent("Testnet");
    expect(button).toHaveAttribute(
      "aria-label",
      "Network: testnet. Click to switch to mainnet",
    );
  });
});
