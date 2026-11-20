/**
 * Tests for issue #784 — GlobalSearch must surface both a stream-id match
 * and a recipient-address match when a single query string happens to be a
 * substring of both, without silently deduplicating or stopping at the first
 * match type found.
 *
 * GlobalSearch builds its Fuse.js index from getMockStreams(). To guarantee
 * deterministic fixture data the real module is replaced with a controlled
 * mock that provides exactly two streams whose searchable text overlaps on a
 * deliberately chosen token ("SHARED") that also forms part of a stream's
 * recipient address. This avoids test-to-test sensitivity to changes in the
 * production mock data while keeping the test focused on the dual-match path.
 *
 * The component requires next/navigation (useRouter, useSearchParams,
 * usePathname) which are auto-aliased to src/test/mocks/next-navigation.ts by
 * vitest.config.ts.
 */
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Suspense } from "react";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * We define two streams such that the query "SHARED" is a substring present
 * in BOTH:
 *
 *   • stream-alpha  — has "SHARED" embedded inside its recipient address
 *                     ("GSHAREDRECIPIENT") so a Fuse title match fires via
 *                     the "${token} Stream — ${sender} → ${recipient}" title.
 *   • stream-beta   — has "SHARED" embedded inside its sender address
 *                     ("GBETA_SENDER_SHARED") so a second title match fires
 *                     from the unrelated sender field.
 *
 * Both items land in the "Stream" category and must both appear in the
 * rendered results list.
 */
const MOCK_STREAMS = [
  {
    id: "alpha-stream-001",
    sender: "GALPHA_SENDER",
    recipient: "GSHAREDRECIPIENT",
    token: "USDC",
    flowRate: 1_000_000,
    deposit: 10_000_000_000,
    startTime: new Date(Date.now() - 86_400_000).toISOString(),
    endTime: new Date(Date.now() + 86_400_000 * 7).toISOString(),
    lastWithdrawTime: new Date(Date.now() - 3_600_000).toISOString(),
    status: "Active",
  },
  {
    id: "beta-stream-002",
    sender: "GBETA_SENDER_SHARED",
    recipient: "GOTHER_RECIPIENT",
    token: "XLM",
    flowRate: 500_000,
    deposit: 5_000_000_000,
    startTime: new Date(Date.now() - 86_400_000 * 2).toISOString(),
    endTime: new Date(Date.now() + 86_400_000 * 5).toISOString(),
    lastWithdrawTime: new Date(Date.now() - 86_400_000).toISOString(),
    status: "Active",
  },
];

// ---------------------------------------------------------------------------
// Module-level mocks — must be hoisted so vitest can apply them before the
// component file's own static imports resolve.
// ---------------------------------------------------------------------------

vi.mock("@/src/lib/sorostream", () => ({
  getMockStreams: () => MOCK_STREAMS,
  /**
   * GlobalSearch filters getMockStreamHistory results to only "real" on-chain
   * entries (entries where isMock !== true). Returning an empty array keeps
   * the index limited to stream items so the assertions below are unambiguous.
   */
  getMockStreamHistory: () => [],
}));

// ---------------------------------------------------------------------------
// Import component after mocks are established
// ---------------------------------------------------------------------------
import GlobalSearch from "@/components/GlobalSearch";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderSearch() {
  return render(
    <Suspense fallback={null}>
      <GlobalSearch />
    </Suspense>,
  );
}

/**
 * Open the search dropdown by clicking the trigger button, then type a
 * query into the revealed input, and advance past the 300 ms debounce.
 */
async function openAndType(query: string) {
  // The trigger button's label is "Open search".
  const openBtn = screen.getByRole("button", { name: /open search/i });
  await act(async () => {
    fireEvent.click(openBtn);
  });

  // The input is `type="search"` which ARIA maps to role "searchbox".
  const input = screen.getByRole("searchbox");
  await act(async () => {
    fireEvent.change(input, { target: { value: query } });
    // Advance past DEBOUNCE_MS (300 ms) so debouncedQuery updates and results render.
    vi.advanceTimersByTime(350);
  });

  return input;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("#784 — GlobalSearch dual stream-id / recipient-address match", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens the search panel when the trigger button is clicked", async () => {
    renderSearch();
    const openBtn = screen.getByRole("button", { name: /open search/i });

    await act(async () => {
      fireEvent.click(openBtn);
    });

    // Once open, the search input is visible.
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  it("shows no results for an empty query", async () => {
    renderSearch();
    await openAndType("");

    // Empty query → no result items rendered.
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("returns BOTH matching streams when the query is a substring of a recipient address AND an unrelated sender address", async () => {
    renderSearch();
    await openAndType("SHARED");

    const options = screen.getAllByRole("option");

    // Both streams must appear — not just the first match type found.
    expect(options.length).toBeGreaterThanOrEqual(2);

    // Verify both stream entries are present by their distinguishing text.
    // stream-alpha: title contains "GSHAREDRECIPIENT"
    const alphaMatch = options.some((el) =>
      el.textContent?.includes("GSHAREDRECIPIENT"),
    );
    // stream-beta: title contains "GBETA_SENDER_SHARED"
    const betaMatch = options.some((el) =>
      el.textContent?.includes("GBETA_SENDER_SHARED"),
    );

    expect(alphaMatch).toBe(true);
    expect(betaMatch).toBe(true);
  });

  it("does not deduplicate the two matches — result count is exactly 2", async () => {
    renderSearch();
    await openAndType("SHARED");

    const options = screen.getAllByRole("option");
    // The index has exactly 2 streams; both match the query. If deduplication
    // were silently occurring (e.g. deduplicating by href or by first-found
    // match type), only 1 result would appear.
    expect(options).toHaveLength(2);
  });

  it("matches that share a query term are distinct objects with different hrefs", async () => {
    renderSearch();
    await openAndType("SHARED");

    const options = screen.getAllByRole("option");
    const hrefs = options
      .map((el) => el.closest("a")?.getAttribute("href") ?? el.getAttribute("data-href"))
      .filter(Boolean);

    // Each result must navigate to a different stream — if both resolved to
    // the same href it would indicate incorrect deduplication or index merging.
    const uniqueHrefs = new Set(hrefs);
    expect(uniqueHrefs.size).toBe(2);
    expect(uniqueHrefs.has("/stream/alpha-stream-001")).toBe(true);
    expect(uniqueHrefs.has("/stream/beta-stream-002")).toBe(true);
  });

  it("a query matching only one stream returns exactly 1 result", async () => {
    renderSearch();
    await openAndType("GOTHER_RECIPIENT");

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0].textContent).toContain("GOTHER_RECIPIENT");
  });

  it("clears results when the input is emptied after a dual-match query", async () => {
    renderSearch();
    const input = await openAndType("SHARED");
    expect(screen.getAllByRole("option")).toHaveLength(2);

    await act(async () => {
      fireEvent.change(input, { target: { value: "" } });
      vi.advanceTimersByTime(350);
    });
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });
});
