/**
 * Shared navigation constants used by both NavHeader and BottomNav.
 *
 * BOTTOM_NAV_HREFS is the single source of truth for which routes appear in
 * the mobile BottomNav's primary four tabs. NavHeader uses this list to filter
 * those same routes out of its desktop drawer, preventing silent duplication
 * or disappearance when either component is updated.
 *
 * MORE_NAV_HREFS lists the routes exposed in BottomNav's "More" drawer — they
 * are reachable on mobile but are not primary tabs. NavHeader includes them in
 * its drawer as well (since they are not in BOTTOM_NAV_HREFS).
 *
 * If you add/remove a route from BottomNav (either the primary tabs or the
 * More drawer), update these arrays — the drift test in
 * __tests__/navDrift.test.ts will fail loudly if they diverge.
 */

export interface NavLink {
  label: string;
  href: string;
}

/** All top-level navigation links. */
export const NAV_LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "New Stream", href: "/stream/new" },
  { label: "Contacts", href: "/address-book" },
  { label: "Settings", href: "/settings" },
  { label: "Analytics", href: "/analytics" },
  { label: "Activity", href: "/activity" },
  { label: "Stats", href: "/stats" },
  { label: "Batch Streams", href: "/stream/batch" },
  { label: "Admin", href: "/admin" },
  { label: "Archive", href: "/archive" },
];

/**
 * The hrefs that appear in BottomNav's primary four tabs (mobile bottom
 * navigation bar). NavHeader filters these out of its drawer to avoid
 * duplicates.
 *
 * This is the ONLY place this list should be defined. Both NavHeader and
 * BottomNav import from here.
 */
export const BOTTOM_NAV_HREFS: string[] = [
  "/dashboard",
  "/stream/new",
  "/address-book",
  "/settings",
];

/**
 * The hrefs that appear in BottomNav's "More" drawer — secondary routes that
 * are mobile-reachable but not primary tabs. Exported so the drift test can
 * assert these are covered by some mobile-visible navigation surface.
 */
export const MORE_NAV_HREFS: string[] = [
  "/analytics",
  "/activity",
  "/stats",
  "/stream/batch",
  "/admin",
  "/archive",
];
