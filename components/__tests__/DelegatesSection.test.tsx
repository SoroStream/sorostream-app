import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { vi } from "vitest";
import DelegatesSection from "../DelegatesSection";

// ── Wallet address used across tests ─────────────────────────────────────────
const WALLET_A = "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGZGEPNS4KBLCG2BMNLZID9";
const WALLET_B = "GDGQVOKHW4VEJRU2TETD6DBAQYJQLK6BCHH65LKJV73AAFLZXLHFLBBZ";

// Storage key format matches the scoped key: `sorostream-delegates:<address>`
const keyFor = (addr: string | null) =>
  `sorostream-delegates:${addr ?? "__no_wallet__"}`;

const ADDR_A = "GB7TJKR6KZ3L3LYPZNAZQJR4HGLJ4E7MSTFJZXQZ2RL4QJKZKSX6JQJ5";
const ADDR_B = "GCZEAELPDHRCOS7XZAFAQ7TMURYCMDH5GB6MLCO4KDYK3AS3HFEIY2EZ";

// ── localStorage mock ─────────────────────────────────────────────────────────
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock, writable: true });

// ── Mock WalletContext ────────────────────────────────────────────────────────
let mockWalletAddress: string | null = WALLET_A;

vi.mock("@/src/context/WalletContext", () => ({
  useWallet: () => ({ address: mockWalletAddress }),
}));

function storedDelegates(walletAddress: string | null = WALLET_A) {
  return JSON.parse(
    window.localStorage.getItem(keyFor(walletAddress)) || "[]",
  ) as Array<{ address: string; addedAt: string; streamIds: string[] }>;
}

describe("DelegatesSection", () => {
  beforeEach(() => {
    mockWalletAddress = WALLET_A;
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows an empty list by default", () => {
    render(<DelegatesSection />);

    expect(screen.getByText("No delegates added yet.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(storedDelegates()).toEqual([]);
  });

  it("appends a valid Stellar address when added", async () => {
    render(<DelegatesSection />);

    const input = screen.getByLabelText("Delegate Address");
    fireEvent.change(input, { target: { value: ADDR_A } });
    fireEvent.click(screen.getByRole("button", { name: "Add Delegate" }));

    await waitFor(() => {
      expect(screen.getByText(/GB7TJK…JQJ5/i)).toBeInTheDocument();
    }, { timeout: 2000 });

    expect(screen.getByText("Can manage all streams")).toBeInTheDocument();
    expect(input).toHaveValue("");
    const saved = storedDelegates();
    expect(saved).toHaveLength(1);
    expect(saved[0].address).toBe(ADDR_A);
  });

  it("shows a validation error when an invalid address is added", async () => {
    render(<DelegatesSection />);

    const input = screen.getByLabelText("Delegate Address");
    fireEvent.change(input, { target: { value: "G123" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Delegate" }));

    expect(await screen.findByText(/must be a valid stellar public key/i)).toBeInTheDocument();
    expect(screen.getByText("No delegates added yet.")).toBeInTheDocument();
    expect(storedDelegates()).toEqual([]);
  });

  it("removes only the selected delegate", () => {
    window.localStorage.setItem(
      keyFor(WALLET_A),
      JSON.stringify([
        { address: ADDR_A, addedAt: "2026-01-01T00:00:00.000Z", streamIds: [] },
        { address: ADDR_B, addedAt: "2026-01-02T00:00:00.000Z", streamIds: [] },
      ]),
    );

    render(<DelegatesSection />);

    expect(screen.getByText(/GB7TJK…JQJ5/i)).toBeInTheDocument();
    expect(screen.getByText(/GCZEAE…Y2EZ/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: `Revoke delegate ${ADDR_A}` }));

    expect(screen.queryByText(/GB7TJK…JQJ5/i)).not.toBeInTheDocument();
    expect(screen.getByText(/GCZEAE…Y2EZ/i)).toBeInTheDocument();

    const saved = storedDelegates();
    expect(saved).toHaveLength(1);
    expect(saved[0].address).toBe(ADDR_B);
  });
});

// ── Issue #918: per-wallet storage scoping ────────────────────────────────────
describe("DelegatesSection wallet scoping (#918)", () => {
  beforeEach(() => {
    mockWalletAddress = WALLET_A;
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("stores delegates under a key scoped to the connected wallet address", async () => {
    render(<DelegatesSection />);

    fireEvent.change(screen.getByLabelText("Delegate Address"), {
      target: { value: ADDR_A },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add Delegate" }));

    await waitFor(() =>
      expect(screen.getByText(/GB7TJK…JQJ5/i)).toBeInTheDocument(),
    );

    // Delegate is stored under WALLET_A's key, not the old global key.
    expect(storedDelegates(WALLET_A)).toHaveLength(1);
    expect(window.localStorage.getItem("sorostream-delegates")).toBeNull();
    // WALLET_B's key is untouched.
    expect(storedDelegates(WALLET_B)).toHaveLength(0);
  });

  it("shows an empty list when a different wallet is connected", () => {
    // Pre-populate WALLET_A's delegates.
    window.localStorage.setItem(
      keyFor(WALLET_A),
      JSON.stringify([
        { address: ADDR_A, addedAt: "2026-01-01T00:00:00.000Z", streamIds: [] },
      ]),
    );

    // Render as WALLET_B — should see no delegates.
    mockWalletAddress = WALLET_B;
    render(<DelegatesSection />);

    expect(screen.getByText("No delegates added yet.")).toBeInTheDocument();
    expect(screen.queryByText(/GB7TJK…JQJ5/i)).not.toBeInTheDocument();
  });

  it("shows the correct delegates after switching wallets", async () => {
    // Both wallets have distinct delegates already saved.
    window.localStorage.setItem(
      keyFor(WALLET_A),
      JSON.stringify([
        { address: ADDR_A, addedAt: "2026-01-01T00:00:00.000Z", streamIds: [] },
      ]),
    );
    window.localStorage.setItem(
      keyFor(WALLET_B),
      JSON.stringify([
        { address: ADDR_B, addedAt: "2026-01-02T00:00:00.000Z", streamIds: [] },
      ]),
    );

    // Mount as WALLET_A — sees ADDR_A.
    mockWalletAddress = WALLET_A;
    const { rerender } = render(<DelegatesSection />);
    expect(screen.getByText(/GB7TJK…JQJ5/i)).toBeInTheDocument();
    expect(screen.queryByText(/GCZEAE…Y2EZ/i)).not.toBeInTheDocument();

    // Switch to WALLET_B — now sees ADDR_B, not ADDR_A.
    mockWalletAddress = WALLET_B;
    rerender(<DelegatesSection />);

    await waitFor(() =>
      expect(screen.getByText(/GCZEAE…Y2EZ/i)).toBeInTheDocument(),
    );
    expect(screen.queryByText(/GB7TJK…JQJ5/i)).not.toBeInTheDocument();
  });
});
