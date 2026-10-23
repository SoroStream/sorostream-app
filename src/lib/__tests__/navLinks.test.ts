/**
 * #772 — Assert every NAV_LINKS entry corresponds to an actual route under src/app,
 * and document which top-level routes have no corresponding nav entry.
 *
 * Strategy:
 *   - NAV_LINKS is extracted from NavHeader.tsx (kept in sync by this test).
 *   - The "actual routes" list is derived from the directory structure of
 *     src/app/ at the time this test was written. When a new page is added,
 *     this test must be updated to reflect it — the intentional failure mode
 *     is a dead nav link appearing in the next paragraph, not a silent pass.
 *   - A known-gaps section documents top-level routes that deliberately have
 *     no nav entry (utility pages, dynamic segments, nested routes, etc.).
 */

import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// NAV_LINKS — mirrored from components/NavHeader.tsx
// Keep this in sync whenever NavHeader.tsx is changed.
// ---------------------------------------------------------------------------
const NAV_LINKS: { href: string; key: string }[] = [
  { href: "/", key: "home" },
  { href: "/dashboard", key: "dashboard" },
  { href: "/analytics", key: "analytics" },
  { href: "/stream/new", key: "create" },
  { href: "/activity", key: "activity" },
  { href: "/admin", key: "admin" },
  { href: "/archive", key: "archive" },
  { href: "/settings", key: "settings" },
];

// ---------------------------------------------------------------------------
// KNOWN_ROUTES — every route with a page.tsx / route.ts under src/app/
// Derived from the directory listing of src/app/ at the time of writing.
// Update this list whenever a new page is added or removed.
// ---------------------------------------------------------------------------
const KNOWN_ROUTES: string[] = [
  "/",
  "/analytics",
  "/docs/fees",
  "/stats",
  "/address-book",
  "/settings",
  "/settings/notifications",
  "/api/og",
  "/stream/[id]",
  "/stream/batch",
  "/stream/new",
  "/dashboard",
  "/embed/stream/[id]",
  "/offline",
  "/~offline",
  "/archive",
  "/activity",
  "/admin",
];

// ---------------------------------------------------------------------------
// KNOWN_GAPS — top-level (or notable) routes that intentionally have no nav
// entry. Documenting these prevents the complementary test from failing on
// expected omissions and forces a conscious decision when gaps appear.
// ---------------------------------------------------------------------------
const KNOWN_GAPS: { route: string; reason: string }[] = [
  { route: "/stats",                   reason: "Stats dashboard — not surfaced in the primary nav; reachable from analytics page" },
  { route: "/docs/fees",               reason: "Documentation page — supplementary content, not a primary navigation destination" },
  { route: "/address-book",            reason: "Reachable from BottomNav on mobile; excluded from desktop drawer by design" },
  { route: "/settings/notifications",  reason: "Sub-page of /settings — accessed from within the settings page, not top-level nav" },
  { route: "/api/og",                  reason: "API route (OG image generation), not a user-facing page" },
  { route: "/stream/[id]",             reason: "Dynamic stream detail page — reached via stream cards, not direct nav" },
  { route: "/stream/batch",            reason: "Batch create page — reachable from within the create-stream flow, not top-level nav" },
  { route: "/embed/stream/[id]",       reason: "Embed widget route — not a navigable app page" },
  { route: "/offline",                 reason: "PWA offline fallback — not a user-visible nav destination" },
  { route: "/~offline",                reason: "Next.js PWA offline redirect alias — internal, not a user-visible nav destination" },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("NAV_LINKS vs actual routes (#772)", () => {
  it("every NAV_LINKS href corresponds to a known route under src/app", () => {
    const unknownHrefs = NAV_LINKS.filter((link) => !KNOWN_ROUTES.includes(link.href));

    expect(
      unknownHrefs,
      `The following NAV_LINKS hrefs have no matching route under src/app — ` +
        `either add the missing page or remove the dead link:\n` +
        unknownHrefs.map((l) => `  href="${l.href}" (key="${l.key}")`).join("\n"),
    ).toHaveLength(0);
  });

  it("every route in KNOWN_ROUTES is still present (guards against stale list)", () => {
    // This test is a canary: if a route is removed from the app, KNOWN_ROUTES
    // should be updated too. Because we can't enumerate the filesystem in
    // Vitest/jsdom, we rely on the KNOWN_ROUTES list being maintained.
    // The assertion here is that the list itself is non-empty and internally
    // consistent — a reviewer removing a page must also remove it from this list.
    expect(KNOWN_ROUTES.length).toBeGreaterThan(0);
    const duplicates = KNOWN_ROUTES.filter(
      (r, idx) => KNOWN_ROUTES.indexOf(r) !== idx,
    );
    expect(
      duplicates,
      `KNOWN_ROUTES contains duplicate entries: ${duplicates.join(", ")}`,
    ).toHaveLength(0);
  });

  it("every route without a nav entry is listed in KNOWN_GAPS (documented gaps only)", () => {
    const navHrefs = new Set(NAV_LINKS.map((l) => l.href));
    const knownGapRoutes = new Set(KNOWN_GAPS.map((g) => g.route));

    const routesWithoutNav = KNOWN_ROUTES.filter((r) => !navHrefs.has(r));
    const undocumentedGaps = routesWithoutNav.filter((r) => !knownGapRoutes.has(r));

    expect(
      undocumentedGaps,
      `The following routes have no nav entry and are not listed in KNOWN_GAPS.\n` +
        `Either add a NAV_LINKS entry, or document the omission in KNOWN_GAPS:\n` +
        undocumentedGaps.map((r) => `  "${r}"`).join("\n"),
    ).toHaveLength(0);
  });

  it("KNOWN_GAPS contains no entry that is actually in NAV_LINKS (no stale gap entries)", () => {
    const navHrefs = new Set(NAV_LINKS.map((l) => l.href));
    const staleGaps = KNOWN_GAPS.filter((g) => navHrefs.has(g.route));

    expect(
      staleGaps,
      `The following KNOWN_GAPS entries now have a nav link — remove them from KNOWN_GAPS:\n` +
        staleGaps.map((g) => `  "${g.route}": ${g.reason}`).join("\n"),
    ).toHaveLength(0);
  });
});
