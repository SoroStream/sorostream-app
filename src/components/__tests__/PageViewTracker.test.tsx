/**
 * Tests for PageViewTracker (#916).
 *
 * Verifies that page_view events are fired for:
 *   1. The initial mount.
 *   2. A pathname change.
 *   3. A query-string-only navigation (same pathname, different search params).
 *   4. That no duplicate event fires when neither pathname nor search params change.
 */
import { render, cleanup, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Hoist mock fns so vi.mock factories can reference them ────────────────────
const { mockTrackEvent } = vi.hoisted(() => ({
  mockTrackEvent: vi.fn(),
}));

vi.mock("@/src/lib/analytics", () => ({
  trackEvent: mockTrackEvent,
  initAnalytics: vi.fn(),
}));

// Keep mutable state so each test can control pathname/searchParams.
let mockPathname = "/";
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
  })),
  useParams: vi.fn(() => ({})),
}));

import PageViewTracker from "../PageViewTracker";

describe("PageViewTracker (#916)", () => {
  beforeEach(() => {
    mockTrackEvent.mockReset();
    mockPathname = "/";
    mockSearchParams = new URLSearchParams();
  });

  afterEach(() => {
    cleanup();
  });

  it("fires a page_view event on initial mount", () => {
    render(<PageViewTracker />);

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith({ type: "page_view", page: "/" });
  });

  it("includes query string in the page value when search params are present", () => {
    mockPathname = "/activity";
    mockSearchParams = new URLSearchParams("sort=date");

    render(<PageViewTracker />);

    expect(mockTrackEvent).toHaveBeenCalledWith({
      type: "page_view",
      page: "/activity?sort=date",
    });
  });

  it("fires a new page_view when only the query string changes (#916)", () => {
    mockPathname = "/activity";
    mockSearchParams = new URLSearchParams("sort=date");

    const { rerender } = render(<PageViewTracker />);
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenLastCalledWith({
      type: "page_view",
      page: "/activity?sort=date",
    });

    // Same pathname, different search params — must trigger a new event.
    mockSearchParams = new URLSearchParams("sort=amount");
    act(() => {
      rerender(<PageViewTracker />);
    });

    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
    expect(mockTrackEvent).toHaveBeenLastCalledWith({
      type: "page_view",
      page: "/activity?sort=amount",
    });
  });

  it("fires a new page_view when the pathname changes", () => {
    mockPathname = "/dashboard";
    mockSearchParams = new URLSearchParams();

    const { rerender } = render(<PageViewTracker />);
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);

    mockPathname = "/activity";
    act(() => {
      rerender(<PageViewTracker />);
    });

    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
    expect(mockTrackEvent).toHaveBeenLastCalledWith({
      type: "page_view",
      page: "/activity",
    });
  });

  it("does not fire an extra event when pathname and search params are unchanged", () => {
    mockPathname = "/streams";
    mockSearchParams = new URLSearchParams("filter=active");

    const { rerender } = render(<PageViewTracker />);
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);

    act(() => {
      rerender(<PageViewTracker />);
    });

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it("renders nothing", () => {
    const { container } = render(<PageViewTracker />);
    expect(container.firstChild).toBeNull();
  });
});
