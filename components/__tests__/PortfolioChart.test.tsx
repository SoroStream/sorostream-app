/**
 * Tests for PortfolioChart's graceful degradation when IndexedDB is
 * unavailable (e.g. Safari private browsing mode, or a user with IndexedDB
 * disabled).
 *
 * ## Cross-reference: balanceCache.ts error handling
 *
 * `balanceCache.ts`'s `openDB()` rejects when `indexedDB.open()` either throws
 * or fires `onerror`. Every public function (`getSnapshots`, `saveSnapshot`,
 * `shouldSnapshot`, etc.) propagates that rejection as a thrown promise.
 *
 * `PortfolioChart.tsx` catches the rejection in `loadSnapshots`:
 *
 * ```ts
 * try {
 *   const data = await getSnapshots(address);
 *   setSnapshots(data);
 * } catch {
 *   setSnapshots([]);   // ← graceful fallback to empty
 * } finally {
 *   setLoading(false);
 * }
 * ```
 *
 * This means when IndexedDB is unavailable, the chart renders its empty state
 * ("No balance data yet for this time range") instead of crashing. These
 * tests verify that behavior holds and that the normal successful-read path
 * is unaffected.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mock WalletContext — PortfolioChart reads `address` and
// `balanceRefreshTrigger` from it.
// ---------------------------------------------------------------------------

const TEST_ADDRESS = "GTESTADDRESS123456789";

vi.mock("@/src/context/WalletContext", () => ({
  useWallet: () => ({
    address: TEST_ADDRESS,
    balanceRefreshTrigger: 0,
  }),
}));

// ---------------------------------------------------------------------------
// Mock balanceCache — controlled via `vi.mock` factory so each test can
// configure whether `getSnapshots` resolves or rejects.
// ---------------------------------------------------------------------------

const mockGetSnapshots = vi.fn();
const mockSaveSnapshot = vi.fn();
const mockShouldSnapshot = vi.fn();

vi.mock("@/src/lib/balanceCache", () => ({
  getSnapshots: (...args: unknown[]) => mockGetSnapshots(...args),
  saveSnapshot: (...args: unknown[]) => mockSaveSnapshot(...args),
  shouldSnapshot: (...args: unknown[]) => mockShouldSnapshot(...args),
}));

// ---------------------------------------------------------------------------
// Lazy-import PortfolioChart after mocks are in place.
// ---------------------------------------------------------------------------

async function renderChart() {
  const { default: PortfolioChart } = await import("@/components/PortfolioChart");
  return render(<PortfolioChart />);
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;

function makeSnapshot(
  address: string,
  daysAgo: number,
  balances: Record<string, number>,
) {
  return {
    address,
    timestamp: new Date(NOW - daysAgo * DAY).toISOString(),
    balances,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PortfolioChart — IndexedDB unavailable graceful degradation (issue #777)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: shouldSnapshot returns false so the snapshot-writing effect
    // doesn't fire network requests during these tests.
    mockShouldSnapshot.mockResolvedValue(false);
    // Default: saveSnapshot resolves (won't be called in most tests).
    mockSaveSnapshot.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the empty-state message when IndexedDB throws (Safari private mode)", async () => {
    // Simulate IndexedDB being unavailable: getSnapshots rejects.
    mockGetSnapshots.mockRejectedValue(
      new Error("IndexedDB is not available in this context"),
    );

    await renderChart();

    // Should show the graceful empty state, not crash.
    await waitFor(() => {
      expect(
        screen.getByText(/no balance data yet for this time range/i),
      ).toBeInTheDocument();
    });
  });

  it("renders the empty-state message when indexedDB.open throws synchronously", async () => {
    // Simulate a synchronous throw from indexedDB.open (e.g. Safari throws
    // a SecurityError before the request is even created).
    mockGetSnapshots.mockRejectedValue(
      new DOMException(
        "The operation is insecure",
        "SecurityError",
      ),
    );

    await renderChart();

    await waitFor(() => {
      expect(
        screen.getByText(/no balance data yet for this time range/i),
      ).toBeInTheDocument();
    });
  });

  it("does not show a loading spinner forever when IndexedDB fails", async () => {
    mockGetSnapshots.mockRejectedValue(new Error("IndexedDB unavailable"));

    await renderChart();

    // The spinner should disappear and the empty state should appear.
    await waitFor(() => {
      expect(
        screen.getByText(/no balance data yet for this time range/i),
      ).toBeInTheDocument();
    });
    expect(screen.queryByRole("status", { name: /loading/i })).not.toBeInTheDocument();
  });

  it("does not crash or throw uncaught errors when IndexedDB is unavailable", async () => {
    mockGetSnapshots.mockRejectedValue(new Error("IndexedDB unavailable"));

    // If the component crashes, the render will throw and the test fails.
    await renderChart();

    // The section heading should still be present (the component rendered).
    expect(
      screen.getByText(/portfolio performance/i),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Successful-read regression tests — ensure existing behavior is unchanged
// ---------------------------------------------------------------------------

describe("PortfolioChart — successful reads (regression, issue #777)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockShouldSnapshot.mockResolvedValue(false);
    mockSaveSnapshot.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders chart data when IndexedDB returns snapshots", async () => {
    const snapshots = [
      makeSnapshot(TEST_ADDRESS, 5, { XLM: 100, USDC: 50 }),
      makeSnapshot(TEST_ADDRESS, 4, { XLM: 110, USDC: 55 }),
      makeSnapshot(TEST_ADDRESS, 3, { XLM: 120, USDC: 60 }),
    ];
    mockGetSnapshots.mockResolvedValue(snapshots);

    await renderChart();

    // Should NOT show the empty state.
    await waitFor(() => {
      expect(
        screen.queryByText(/no balance data yet for this time range/i),
      ).not.toBeInTheDocument();
    });

    // Should show the portfolio heading and summary values.
    expect(screen.getByText(/portfolio performance/i)).toBeInTheDocument();
  });

  it("renders the empty state when IndexedDB returns an empty array", async () => {
    mockGetSnapshots.mockResolvedValue([]);

    await renderChart();

    await waitFor(() => {
      expect(
        screen.getByText(/no balance data yet for this time range/i),
      ).toBeInTheDocument();
    });
  });
});
