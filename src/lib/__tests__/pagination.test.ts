import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  DASHBOARD_PAGE_SIZE,
  clampPage,
  getTotalPages,
  usePagination,
} from "@/src/lib/pagination";
import { getStreamsForWallet, getStreamsPageForWallet } from "@/src/lib/sorostream";

describe("getTotalPages", () => {
  it("rounds up and never returns less than 1", () => {
    expect(getTotalPages(0, 20)).toBe(1);
    expect(getTotalPages(20, 20)).toBe(1);
    expect(getTotalPages(21, 20)).toBe(2);
    expect(getTotalPages(45, 20)).toBe(3);
  });
});

describe("clampPage", () => {
  it("keeps the page inside [1, totalPages]", () => {
    expect(clampPage(0, 3)).toBe(1);
    expect(clampPage(2, 3)).toBe(2);
    expect(clampPage(5, 3)).toBe(3);
    expect(clampPage(Number.NaN, 3)).toBe(1);
  });
});

describe("usePagination", () => {
  it("uses a page size of 20 for the dashboard", () => {
    expect(DASHBOARD_PAGE_SIZE).toBe(20);
  });

  it("filter + sort on page 2 stays on page 2 and recalculates the page count", () => {
    // Simulates the dashboard: 60 streams, then a filter reduces them to 45,
    // then a sort reorders the same 45.
    const { result, rerender } = renderHook(
      ({ count }) => usePagination(count, 20),
      { initialProps: { count: 60 } },
    );
    expect(result.current.totalPages).toBe(3);

    act(() => result.current.setPage(2));
    expect(result.current.currentPage).toBe(2);

    // Filter applied — fewer items, but page 2 still exists.
    rerender({ count: 45 });
    expect(result.current.currentPage).toBe(2);
    expect(result.current.totalPages).toBe(3);
    expect(result.current.pageStart).toBe(20);
    expect(result.current.pageEnd).toBe(40);

    // Sort applied — count unchanged, page preserved.
    rerender({ count: 45 });
    expect(result.current.currentPage).toBe(2);
    expect(result.current.totalPages).toBe(3);
  });

  it("moves to the new last page when a filter removes the current page", () => {
    const { result, rerender } = renderHook(
      ({ count }) => usePagination(count, 20),
      { initialProps: { count: 60 } },
    );
    act(() => result.current.setPage(3));

    rerender({ count: 30 });
    expect(result.current.totalPages).toBe(2);
    expect(result.current.currentPage).toBe(2);
    expect(result.current.hasNext).toBe(false);
  });

  it("does not go past the first or last page", () => {
    const { result } = renderHook(() => usePagination(25, 20));
    act(() => result.current.prevPage());
    expect(result.current.currentPage).toBe(1);
    act(() => result.current.nextPage());
    act(() => result.current.nextPage());
    expect(result.current.currentPage).toBe(2);
  });
});

describe("getStreamsPageForWallet", () => {
  it("returns only the requested slice plus the total", () => {
    const all = getStreamsForWallet(null);
    const first = getStreamsPageForWallet(null, { limit: 2 });
    expect(first.total).toBe(all.length);
    expect(first.streams.length).toBe(Math.min(2, all.length));

    const rest = getStreamsPageForWallet(null, { offset: 2, limit: all.length });
    const ids = [...first.streams, ...rest.streams].map((s) => s.id);
    expect(new Set(ids).size).toBe(all.length);
  });

  it("orders streams newest first", () => {
    const { streams } = getStreamsPageForWallet(null, { limit: 100 });
    for (let i = 1; i < streams.length; i++) {
      expect(new Date(streams[i - 1].startTime).getTime()).toBeGreaterThanOrEqual(
        new Date(streams[i].startTime).getTime(),
      );
    }
  });
});
