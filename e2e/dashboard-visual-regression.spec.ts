import { test, expect } from "@playwright/test";

/**
 * Visual regression test for the dashboard layout (#619).
 *
 * The dashboard combines a portfolio summary, wallet analytics, performance
 * metrics, tab switcher, and stream list — regressions to that layout (e.g.
 * a spacing/breakpoint change in one of those sections) are easy to miss in
 * functional tests but obvious in a screenshot diff.
 *
 * Freezes the clock like `analytics-visual-regression.spec.ts` since the app
 * uses an in-memory mock store with Date.now()-based timestamps.
 *
 * Update the baselines when the dashboard's styling changes intentionally:
 *   npx playwright test e2e/dashboard-visual-regression.spec.ts --update-snapshots
 *
 * See docs/playwright-e2e.md#visual-regression-baselines for the full
 * baseline-image workflow (why baselines aren't committed, and how CI/local
 * runs should treat this suite).
 */

const FIXED_NOW = new Date("2026-07-15T12:00:00Z").getTime();

test.describe("Dashboard visual regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(FIXED_NOW);
  });

  test("matches the dark-mode baseline", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
    });
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const dashboard = page.locator("main#main-content");
    await expect(dashboard).toBeVisible();

    await expect(dashboard).toHaveScreenshot("dashboard-dark.png", {
      animations: "disabled",
    });
  });

  test("matches the light-mode baseline", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.addInitScript(() => {
      localStorage.setItem("theme", "light");
    });
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const dashboard = page.locator("main#main-content");
    await expect(dashboard).toBeVisible();

    await expect(dashboard).toHaveScreenshot("dashboard-light.png", {
      animations: "disabled",
    });
  });

  test("matches the mobile dark-mode baseline", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: "dark" });
    await page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
    });
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const dashboard = page.locator("main#main-content");
    await expect(dashboard).toBeVisible();

    await expect(dashboard).toHaveScreenshot("dashboard-mobile-dark.png", {
      animations: "disabled",
    });
  });
});
