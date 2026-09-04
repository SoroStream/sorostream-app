import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RecipientAutocomplete from "../RecipientAutocomplete";
import { saveContact } from "@/src/lib/addressBook";

const SENDER = "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ";
const CONTACT_ALICE = {
  id: "c1",
  name: "Alice Smith",
  address: "GB7B2XS7YYUWVLXUYG6EWBEYHV4WTUY5VWFDOXWOITVNHAJBMMRV7ZGO",
};
const CONTACT_BOB = {
  id: "c2",
  name: "Bob Jones",
  address: "GBNXCYRRNEDAWVGXPPZJMMDTVZTHKVOZRAAS6UEOLSKFPBJBLXJJFAYU",
};

describe("RecipientAutocomplete Address Book Selection", () => {
  beforeEach(() => {
    localStorage.clear();
    saveContact(CONTACT_ALICE, SENDER);
    saveContact(CONTACT_BOB, SENDER);
  });

  it("displays saved contacts in dropdown when input is focused", async () => {
    const handleChange = vi.fn();
    const handleBlur = vi.fn();

    render(
      <RecipientAutocomplete
        value=""
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="Enter recipient..."
        senderAddress={SENDER}
      />,
    );

    const input = screen.getByTestId("recipient-input");
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByTestId("address-book-dropdown")).toBeInTheDocument();
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
      expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    });
  });

  it("filters contacts by name when typing", async () => {
    const handleChange = vi.fn();
    const handleBlur = vi.fn();

    render(
      <RecipientAutocomplete
        value="Alice"
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="Enter recipient..."
        senderAddress={SENDER}
      />,
    );

    const input = screen.getByTestId("recipient-input");
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
      expect(screen.queryByText("Bob Jones")).not.toBeInTheDocument();
    });
  });

  it("selects contact by name and calls onChange with full Stellar address", async () => {
    const handleChange = vi.fn();
    const handleBlur = vi.fn();

    render(
      <RecipientAutocomplete
        value=""
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="Enter recipient..."
        senderAddress={SENDER}
      />,
    );

    const input = screen.getByTestId("recipient-input");
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    const aliceOption = screen.getByTestId("contact-option-Alice Smith");
    fireEvent.mouseDown(aliceOption);

    expect(handleChange).toHaveBeenCalledWith(CONTACT_ALICE.address);
  });

  it("toggles dropdown visibility using the address book toggle button", async () => {
    const handleChange = vi.fn();
    const handleBlur = vi.fn();

    render(
      <RecipientAutocomplete
        value=""
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="Enter recipient..."
        senderAddress={SENDER}
      />,
    );

    const toggleBtn = screen.getByTestId("address-book-toggle");
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(screen.getByTestId("address-book-dropdown")).toBeInTheDocument();
    });
  });
});
