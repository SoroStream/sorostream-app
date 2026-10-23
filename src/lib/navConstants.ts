/**
 * Shared navigation constants used by both NavHeader and BottomNav.
 *
 * BOTTOM_NAV_HREFS is the single source of truth for which routes appear in
 * the mobile BottomNav. NavHeader uses this list to filter those same routes
 * out of its desktop drawer, preventing silent duplication or disappearance
 * when either component is updated.
 *
 * If you add/remove a route from BottomNav, update this array — the drift
 * test in __tests__/navDrift.test.ts will fail loudly if they diverge.
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
];

/**
 * The hrefs that appear in BottomNav (mobile bottom navigation bar).
 * NavHeader filters these out of its drawer to avoid duplicates.
 *
 * This is the ONLY place this list should be defined. Both NavHeader and
 * BottomNav import from here.
 */
export const BOTTOM_NAV_HREFS: string[] = ["/dashboard", "/stream/new"];
