/**
 * Tests for #769/#768/#767 — BottomNav must provide a mobile-reachable path
 * to every top-level route that is listed in NavHeader's NAV_LINKS.
 *
 * Strategy: parse both source files statically so we never need to render
 * the full component tree with all its context providers.
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, it, expect } from "vitest";

const ROOT = resolve(__dirname, "../..");

function readSrc(rel: string) {
  return readFileSync(resolve(ROOT, rel), "utf8");
}

// All hrefs that NavHeader's NAV_LINKS exposes on desktop
const NAV_LINKS_HREFS = [
  "/",
  "/dashboard",
  "/analytics",
  "/stream/new",
  "/stream/batch",
  "/stats",
  "/activity",
  "/admin",
  "/archive",
  "/settings",
];

// Routes that BottomNav surfaces directly in its primary bar
const PRIMARY_BAR_HREFS = [
  "/dashboard",
  "/stream/new",
  "/address-book",
  "/settings",
];

// Routes that BottomNav surfaces via the "More" drawer
const MORE_DRAWER_HREFS = [
  "/analytics",
  "/stats",
  "/stream/batch",
  "/activity",
  "/admin",
  "/archive",
];

describe("#769 / #768 / #767 — BottomNav mobile navigation coverage", () => {
  const bottomNavSrc = readSrc("components/BottomNav.tsx");

  it("renders the More button so secondary destinations are reachable", () => {
    expect(bottomNavSrc).toMatch(/More/);
    expect(bottomNavSrc).toMatch(/more-nav-drawer/);
  });

  it("includes every primary-bar href in BottomNav source", () => {
    for (const href of PRIMARY_BAR_HREFS) {
      expect(bottomNavSrc, `Expected "${href}" to be in BottomNav`).toContain(`"${href}"`);
    }
  });

  it("includes every More-drawer href (analytics, stats, stream/batch, activity, admin, archive) in BottomNav source", () => {
    for (const href of MORE_DRAWER_HREFS) {
      expect(bottomNavSrc, `Expected "${href}" to be in BottomNav`).toContain(`"${href}"`);
    }
  });

  it("every NAV_LINKS href is reachable from BottomNav (primary bar or More drawer)", () => {
    const reachable = [...PRIMARY_BAR_HREFS, ...MORE_DRAWER_HREFS, "/"];
    for (const href of NAV_LINKS_HREFS) {
      const inSource = bottomNavSrc.includes(`"${href}"`) || bottomNavSrc.includes(`'${href}'`);
      // "/" (home) is the brand link, not required in BottomNav itself
      if (href === "/") continue;
      expect(inSource, `Route "${href}" is not reachable from BottomNav`).toBe(true);
    }
  });

  it("includes /stats link pointing to the correct route (#767)", () => {
    expect(bottomNavSrc).toContain('"/stats"');
  });

  it("includes /stream/batch link pointing to the correct route (#768)", () => {
    expect(bottomNavSrc).toContain('"/stream/batch"');
  });
});

describe("#767 — NavHeader NAV_LINKS includes /stats", () => {
  const navSrc = readSrc("components/NavHeader.tsx");

  it("has /stats in NAV_LINKS", () => {
    expect(navSrc).toContain('"/stats"');
  });

  it("has stats i18n key in NAV_LINKS", () => {
    expect(navSrc).toContain('key: "stats"');
  });
});

describe("#768 — NavHeader NAV_LINKS includes /stream/batch", () => {
  const navSrc = readSrc("components/NavHeader.tsx");

  it("has /stream/batch in NAV_LINKS", () => {
    expect(navSrc).toContain('"/stream/batch"');
  });

  it("has batch i18n key in NAV_LINKS", () => {
    expect(navSrc).toContain('key: "batch"');
  });
});
