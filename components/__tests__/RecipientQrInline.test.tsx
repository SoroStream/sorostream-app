/**
 * Tests for #452: Inline QR code display for recipient Stellar address.
 */
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RecipientQrInline from "@/components/RecipientQrInline";

// Mock qrcode so we don't need a real canvas in jsdom
vi.mock("qrcode", () => ({
  default: {
    toCanvas: vi.fn().mockResolvedValue(undefined),
  },
}));

const STELLAR_ADDRESS = "GBAMK6KZ3L3LYPZNAZQJR4HGLJ4E7MSTFJZXQZ2RL4QJKZKSX6JQJ5";

describe("#452 — RecipientQrInline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a toggle button with 'Recipient QR Code' label", () => {
    render(<RecipientQrInline recipient={STELLAR_ADDRESS} />);
    const btn = screen.getByRole("button", { name: /recipient qr code/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("aria-expanded", "false");
  });

  it("is collapsed by default — canvas is not visible", () => {
    render(<RecipientQrInline recipient={STELLAR_ADDRESS} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    // The canvas element should not be rendered yet
    const canvas = document.querySelector("canvas");
    expect(canvas).not.toBeInTheDocument();
  });

  it("expands to show the QR canvas when the toggle button is clicked", async () => {
    render(<RecipientQrInline recipient={STELLAR_ADDRESS} />);
    const btn = screen.getByRole("button", { name: /recipient qr code/i });

    await act(async () => {
      fireEvent.click(btn);
    });

    expect(btn).toHaveAttribute("aria-expanded", "true");
    const canvas = document.querySelector("canvas");
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute("aria-label", expect.stringContaining(STELLAR_ADDRESS));
  });

  it("shows the recipient address text when expanded", async () => {
    render(<RecipientQrInline recipient={STELLAR_ADDRESS} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /recipient qr code/i }));
    });

    expect(screen.getByText(STELLAR_ADDRESS)).toBeInTheDocument();
  });

  it("has Copy Address and Download PNG buttons when expanded", async () => {
    render(<RecipientQrInline recipient={STELLAR_ADDRESS} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /recipient qr code/i }));
    });

    expect(screen.getByRole("button", { name: /copy address/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download png/i })).toBeInTheDocument();
  });

  it("copies the Stellar address on clicking Copy Address", async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText: mockWriteText } });

    render(<RecipientQrInline recipient={STELLAR_ADDRESS} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /recipient qr code/i }));
    });

    const copyBtn = screen.getByRole("button", { name: /copy address/i });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(mockWriteText).toHaveBeenCalledWith(STELLAR_ADDRESS);
    // Shows "Copied!" feedback
    expect(screen.getByRole("button", { name: /copied!/i })).toBeInTheDocument();
  });

  it("collapses again when toggle is clicked a second time", async () => {
    render(<RecipientQrInline recipient={STELLAR_ADDRESS} />);
    const btn = screen.getByRole("button", { name: /recipient qr code/i });

    await act(async () => { fireEvent.click(btn); });
    expect(document.querySelector("canvas")).toBeInTheDocument();

    await act(async () => { fireEvent.click(btn); });
    expect(document.querySelector("canvas")).not.toBeInTheDocument();
    expect(btn).toHaveAttribute("aria-expanded", "false");
  });

  it("encodes a stellar: URI for addresses starting with G", async () => {
    const QRCode = await import("qrcode");
    const toCanvas = vi.mocked(QRCode.default.toCanvas);

    render(<RecipientQrInline recipient={STELLAR_ADDRESS} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /recipient qr code/i }));
    });

    expect(toCanvas).toHaveBeenCalledWith(
      expect.anything(),
      `stellar:${STELLAR_ADDRESS}`,
      expect.objectContaining({ width: 200 }),
    );
  });

  // -------------------------------------------------------------------------
  // issue #889 — C... (Soroban contract) addresses
  // -------------------------------------------------------------------------

  /**
   * C... addresses identify Soroban smart contracts, not user accounts.
   * The current component intentionally encodes them as the bare address
   * string rather than prefixing `stellar:`, because the SEP-7 `stellar:`
   * URI scheme is defined for transferable accounts, not contracts.
   *
   * These tests document the current behaviour so that any future change to
   * the scheme logic triggers a deliberate test update rather than a silent
   * regression.
   */

  describe("#889 — contract (C...) recipient address QR encoding", () => {
    // A realistic-length Soroban contract address (56 characters, starts with C).
    const CONTRACT_ADDRESS =
      "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";

    it("renders without error for a C... recipient", () => {
      expect(() =>
        render(<RecipientQrInline recipient={CONTRACT_ADDRESS} />),
      ).not.toThrow();
    });

    it("shows the contract address text when expanded", async () => {
      render(<RecipientQrInline recipient={CONTRACT_ADDRESS} />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /recipient qr code/i }));
      });

      expect(screen.getByText(CONTRACT_ADDRESS)).toBeInTheDocument();
    });

    it("encodes the bare address (no stellar: prefix) for a C... recipient", async () => {
      const QRCode = await import("qrcode");
      const toCanvas = vi.mocked(QRCode.default.toCanvas);

      render(<RecipientQrInline recipient={CONTRACT_ADDRESS} />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /recipient qr code/i }));
      });

      // The QR payload must be the raw address, not `stellar:${CONTRACT_ADDRESS}`.
      expect(toCanvas).toHaveBeenCalledWith(
        expect.anything(),
        CONTRACT_ADDRESS,
        expect.objectContaining({ width: 200 }),
      );

      // Confirm the stellar: variant was NOT used — wallets scanning a bare
      // C... string receive just the contract ID with no URI scheme.
      expect(toCanvas).not.toHaveBeenCalledWith(
        expect.anything(),
        `stellar:${CONTRACT_ADDRESS}`,
        expect.anything(),
      );
    });

    it("the aria-label on the QR canvas references the contract address", async () => {
      render(<RecipientQrInline recipient={CONTRACT_ADDRESS} />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /recipient qr code/i }));
      });

      const canvas = document.querySelector("canvas");
      expect(canvas).toHaveAttribute(
        "aria-label",
        expect.stringContaining(CONTRACT_ADDRESS),
      );
    });

    it("Copy Address copies the raw contract address (no URI scheme prepended)", async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { clipboard: { writeText: mockWriteText } });

      render(<RecipientQrInline recipient={CONTRACT_ADDRESS} />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /recipient qr code/i }));
      });

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /copy address/i }));
      });

      // The copy target is always the raw recipient prop, regardless of what
      // the QR encodes. This keeps clipboard content scannable for other uses.
      expect(mockWriteText).toHaveBeenCalledWith(CONTRACT_ADDRESS);
      expect(mockWriteText).not.toHaveBeenCalledWith(
        `stellar:${CONTRACT_ADDRESS}`,
      );
    });
  });
});
