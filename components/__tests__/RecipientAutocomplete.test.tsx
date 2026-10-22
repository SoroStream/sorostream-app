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

describe("RecipientAutocomplete outside click (#545)", () => {
  beforeEach(() => {
    localStorage.clear();
    saveContact(CONTACT_ALICE, SENDER);
    saveContact(CONTACT_BOB, SENDER);
  });

  it("closes the dropdown on an outside mousedown without a blur event", async () => {
    render(
      <RecipientAutocomplete
        value=""
        onChange={vi.fn()}
        onBlur={vi.fn()}
        senderAddress={SENDER}
      />,
    );

    fireEvent.focus(screen.getByTestId("recipient-input"));
    await waitFor(() => {
      expect(screen.getByTestId("address-book-dropdown")).toBeInTheDocument();
    });

    // Safari never fires blur when the click lands on a non-focusable element,
    // so the document-level mousedown listener is what has to close it.
    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(screen.queryByTestId("address-book-dropdown")).not.toBeInTheDocument();
    });
  });

  it("keeps the dropdown open for clicks inside the container", async () => {
    render(
      <RecipientAutocomplete
        value=""
        onChange={vi.fn()}
        onBlur={vi.fn()}
        senderAddress={SENDER}
      />,
    );

    fireEvent.focus(screen.getByTestId("recipient-input"));
    await waitFor(() => {
      expect(screen.getByTestId("address-book-dropdown")).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByTestId("address-book-toggle"));
    expect(screen.getByTestId("address-book-dropdown")).toBeInTheDocument();
  });

  it("removes the document listener on unmount", async () => {
    const addSpy = vi.spyOn(document, "addEventListener");
    const removeSpy = vi.spyOn(document, "removeEventListener");

    const { unmount } = render(
      <RecipientAutocomplete
        value=""
        onChange={vi.fn()}
        onBlur={vi.fn()}
        senderAddress={SENDER}
      />,
    );

    fireEvent.focus(screen.getByTestId("recipient-input"));
    await waitFor(() => {
      expect(screen.getByTestId("address-book-dropdown")).toBeInTheDocument();
    });

    const added = addSpy.mock.calls.filter(
      ([type]) => type === "mousedown" || type === "touchstart",
    );
    expect(added.length).toBeGreaterThan(0);

    unmount();

    const removed = removeSpy.mock.calls.filter(
      ([type]) => type === "mousedown" || type === "touchstart",
    );
    expect(removed.length).toBe(added.length);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
