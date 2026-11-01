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
  /** Key into the "nav" i18n namespace (src/locales/*.json) for this link's
   * translated label. NavHeader looks this up via useTranslations("nav");
   * `label` above is the English fallback (used by BottomNav, which is
   * icon-led and doesn't translate its tab text). */
  key: string;
}

/** All top-level navigation links. */
export const NAV_LINKS: NavLink[] = [
  { label: "Home", href: "/", key: "home" },
  { label: "Dashboard", href: "/dashboard", key: "dashboard" },
  { label: "New Stream", href: "/stream/new", key: "create" },
  { label: "Contacts", href: "/address-book", key: "contacts" },
  { label: "Settings", href: "/settings", key: "settings" },
  { label: "Analytics", href: "/analytics", key: "analytics" },
  { label: "Activity", href: "/activity", key: "activity" },
  { label: "Stats", href: "/stats", key: "stats" },
  { label: "Batch Streams", href: "/stream/batch", key: "batch" },
  { label: "Admin", href: "/admin", key: "admin" },
  { label: "Archive", href: "/archive", key: "archive" },
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
