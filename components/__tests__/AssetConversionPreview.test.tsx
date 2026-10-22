import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import AssetConversionPreview from "@/components/AssetConversionPreview";
import { SettingsProvider } from "@/src/context/SettingsContext";

vi.mock("@/components/FiatDisplay", () => ({
  default: () => null,
}));

describe("AssetConversionPreview (#420)", () => {
  it("renders the fiat equivalent for a USDC amount", async () => {
    render(
      <SettingsProvider>
        <AssetConversionPreview amount="100" tokenSymbol="USDC" />
      </SettingsProvider>,
    );
    expect(await screen.findByText(/~100\.00 USD/)).toBeInTheDocument();
  });

  it("renders nothing for an empty amount", () => {
    const { container } = render(
      <SettingsProvider>
        <AssetConversionPreview amount="" tokenSymbol="USDC" />
      </SettingsProvider>,
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows price unavailable for an unknown token", async () => {
    render(
      <SettingsProvider>
        <AssetConversionPreview amount="100" tokenSymbol="DOGE" />
      </SettingsProvider>,
    );
    expect(await screen.findByText(/Price unavailable/)).toBeInTheDocument();
  });
});
