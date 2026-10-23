/**
 * @jest-environment node
 *
 * Drift test for issue #778: NavHeader's DRAWER_LINKS vs BottomNav's link list.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * Before feat/778, NavHeader maintained its own local copy of BOTTOM_NAV_HREFS
 * and used it to filter links out of its drawer. BottomNav maintained a
 * separate, independently-edited list. If one was updated without the other,
 * a link could silently vanish from the drawer or appear in both places with
 * no test catching it.
 *
 * Now both components share a single BOTTOM_NAV_HREFS constant from
 * src/lib/navConstants.ts. This test asserts that the hrefs rendered by
 * BottomNav exactly match BOTTOM_NAV_HREFS, so any future drift (e.g., a
 * developer adding a link directly inside BottomNav instead of editing
 * navConstants.ts) is caught immediately.
 */

import { BOTTOM_NAV_HREFS, NAV_LINKS } from "../src/lib/navConstants";
import { BOTTOM_NAV_LINKS } from "../components/BottomNav";
import { DRAWER_LINKS } from "../components/NavHeader";

describe("NavHeader / BottomNav shared constant drift test (#778)", () => {
  /**
   * Core invariant: BottomNav's rendered hrefs must exactly match
   * BOTTOM_NAV_HREFS. If someone adds a link directly inside BottomNav.tsx
   * without going through navConstants.ts, this test fails loudly.
   */
  it("BottomNav link hrefs exactly match BOTTOM_NAV_HREFS constant", () => {
    const bottomNavHrefs = BOTTOM_NAV_LINKS.map((l) => l.href).sort();
    const expectedHrefs = [...BOTTOM_NAV_HREFS].sort();

    expect(bottomNavHrefs).toEqual(expectedHrefs);
  });

  /**
   * NavHeader's drawer must not contain any href that appears in BottomNav.
   * This guards against the duplication scenario.
   */
  it("NavHeader DRAWER_LINKS contains no hrefs from BOTTOM_NAV_HREFS", () => {
    const drawerHrefs = DRAWER_LINKS.map((l) => l.href);
    const overlap = drawerHrefs.filter((href) => BOTTOM_NAV_HREFS.includes(href));

    expect(overlap).toEqual([]);
  });

  /**
   * Every NAV_LINK must appear in exactly one of: DRAWER_LINKS or BottomNav.
   * No link should be orphaned (appears in neither).
   */
  it("every NAV_LINK appears in either DRAWER_LINKS or BOTTOM_NAV_LINKS, not both", () => {
    const drawerHrefs = new Set(DRAWER_LINKS.map((l) => l.href));
    const bottomHrefs = new Set(BOTTOM_NAV_LINKS.map((l) => l.href));

    for (const link of NAV_LINKS) {
      const inDrawer = drawerHrefs.has(link.href);
      const inBottom = bottomHrefs.has(link.href);

      // Must appear in at least one place.
      expect(inDrawer || inBottom).toBe(true);

      // Must not appear in both places.
      expect(inDrawer && inBottom).toBe(false);
    }
  });

  /**
   * BOTTOM_NAV_HREFS must only reference hrefs that actually exist in NAV_LINKS.
   * Guards against stale entries left in BOTTOM_NAV_HREFS after a route removal.
   */
  it("BOTTOM_NAV_HREFS only contains hrefs present in NAV_LINKS", () => {
    const allHrefs = new Set(NAV_LINKS.map((l) => l.href));
    const stale = BOTTOM_NAV_HREFS.filter((href) => !allHrefs.has(href));

    expect(stale).toEqual([]);
  });
});
