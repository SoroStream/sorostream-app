"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/** Number of streams shown per dashboard page (and fetched on initial load). */
export const DASHBOARD_PAGE_SIZE = 20;

/** Total number of pages for `itemCount` items; always at least 1. */
export function getTotalPages(itemCount: number, pageSize: number): number {
  if (pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(itemCount / pageSize));
}

/** Clamp `page` into the valid range `[1, totalPages]`. */
export function clampPage(page: number, totalPages: number): number {
  if (!Number.isFinite(page)) return 1;
  return Math.min(Math.max(1, Math.floor(page)), Math.max(1, totalPages));
}

/**
 * Page-based pagination state.
 *
 * The current page is preserved when `itemCount` changes (e.g. after a
 * filter or sort) and the page count is recalculated from the new count.
 * The page is only moved if it would fall past the new last page.
 */
export function usePagination(itemCount: number, pageSize: number = DASHBOARD_PAGE_SIZE) {
  const [rawPage, setRawPage] = useState(1);
  const totalPages = useMemo(() => getTotalPages(itemCount, pageSize), [itemCount, pageSize]);
  // Derive the effective page synchronously so we never render an
  // out-of-range "Page 3 of 2" frame between the change and the effect.
  const currentPage = clampPage(rawPage, totalPages);

  useEffect(() => {
    if (rawPage !== currentPage) setRawPage(currentPage);
  }, [rawPage, currentPage]);

  const setPage = useCallback(
    (page: number) => setRawPage(clampPage(page, totalPages)),
    [totalPages],
  );
  const nextPage = useCallback(() => setPage(currentPage + 1), [setPage, currentPage]);
  const prevPage = useCallback(() => setPage(currentPage - 1), [setPage, currentPage]);

  const pageStart = (currentPage - 1) * pageSize;
  const pageEnd = pageStart + pageSize;

  return {
    currentPage,
    totalPages,
    pageStart,
    pageEnd,
    setPage,
    nextPage,
    prevPage,
    hasPrev: currentPage > 1,
    hasNext: currentPage < totalPages,
  };
}
