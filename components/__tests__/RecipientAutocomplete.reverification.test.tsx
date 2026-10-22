import { useCallback, useEffect, useState } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RecipientAutocomplete from "../RecipientAutocomplete";
import AddressVerificationBadge from "../AddressVerificationBadge";
import { verifyAddress, type AddressVerification } from "@/src/lib/addressVerification";
import { resolveFederationName } from "@/src/lib/federation";
import { resolveTomlDisplayName } from "@/src/lib/stellarToml";

vi.mock("@/src/lib/i18n", () => ({
  useTranslations: () => (key: string) => ({
    address_verified: "Verified",
    address_unverified: "Unverified",
    address_active: "Active",
    address_verifying: "Verifying…",
  })[key],
}));

const ADDRESS = "GB7B2XS7YYUWVLXUYG6EWBEYHV4WTUY5VWFDOXWOITVNHAJBMMRV7ZGO";
const NAME = "alice*stellar.org";

describe("RecipientAutocomplete background re-verification (#785)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("marks the selected federation recipient unverified and invalidates its cached identity", async () => {
    let accountExists = true;
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/accounts/")) {
        return new Response("{}", { status: accountExists ? 200 : 404 });
      }
      if (url.endsWith("/.well-known/stellar.toml")) {
        return new Response(`FEDERATION_SERVER = "https://stellar.org/federation"\n[[ACCOUNTS]]\naddress = "${ADDRESS}"\nalias = "Alice"`);
      }
      return new Response(JSON.stringify({ account_id: ADDRESS, stellar_address: NAME }), {
        status: accountExists ? 200 : 404,
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    let reverify!: () => Promise<void>;
    // Controlled parent combines autocomplete with verification feedback:
    // selection supplies the G-address; verification supplies error and badge.
    function RecipientField() {
      const [value, setValue] = useState("");
      const [verification, setVerification] = useState<AddressVerification | null>(null);
      const check = useCallback(async () => {
        if (value.startsWith("G")) setVerification(await verifyAddress(value));
      }, [value]);
      reverify = check;
      useEffect(() => { void check(); }, [check]);
      return <>
        <RecipientAutocomplete
          value={value}
          onChange={setValue}
          onBlur={() => {}}
          error={verification?.status === "unverified" ? verification.error ?? "Unverified" : undefined}
        />
        {verification && <AddressVerificationBadge
          status={verification.status}
          federationName={verification.federationName}
        />}
      </>;
    }

    render(<RecipientField />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: NAME } });
    await waitFor(() => expect(input).toHaveValue(ADDRESS));
    await screen.findByText("Verified");
    expect(input).toHaveAttribute("aria-invalid", "false");
    expect(screen.getByText(`(${NAME})`)).toBeInTheDocument();
    expect(sessionStorage.getItem(`sorostream-fed-${NAME}`)).toBe(ADDRESS);
    expect(sessionStorage.getItem(`sorostream-fed-${ADDRESS}`)).toBe(NAME);
    expect(await resolveTomlDisplayName(ADDRESS)).toBe("Alice");

    // Expire the real five-minute verification cache without remounting the
    // field or clearing storage. The next background pass must hit Horizon.
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now + 5 * 60 * 1000 + 1);
    accountExists = false;
    const horizonCallsBefore = fetchMock.mock.calls.filter(([url]) => url.includes("/accounts/")).length;
    await act(async () => { await reverify(); });

    expect(screen.getByText("Unverified")).toBeInTheDocument();
    expect(screen.queryByText("Verified")).not.toBeInTheDocument();
    expect(screen.queryByText(`(${NAME})`)).not.toBeInTheDocument();
    expect(screen.queryByText("Federation resolved")).not.toBeInTheDocument();
    expect(input).toHaveValue(ADDRESS);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock.mock.calls.filter(([url]) => url.includes("/accounts/"))).toHaveLength(horizonCallsBefore + 1);

    // Real invalidation mechanisms: #698 for federation and #725 for TOML.
    // Keep this integration coverage when #698's public hook is extended.
    expect(sessionStorage.getItem(`sorostream-fed-${NAME}`)).toBeNull();
    expect(sessionStorage.getItem(`sorostream-fed-${ADDRESS}`)).toBeNull();
    expect(sessionStorage.getItem(`sorostream-toml-${ADDRESS}`)).toBeNull();
    const callsBefore = fetchMock.mock.calls.length;
    expect(await resolveFederationName(NAME)).toBeNull();
    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});
