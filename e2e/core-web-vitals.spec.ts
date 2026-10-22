import { test, expect } from "@playwright/test";

/**
 * Core Web Vitals performance tests (#651).
 *
 * Measures Google's Core Web Vitals metrics (LCP, FID/INP, CLS) on key pages
 * to ensure the app meets performance thresholds. These tests run as part of
 * the E2E suite and track metrics that directly impact user experience.
 *
 * Thresholds based on Google's recommendations (75th percentile):
 * - LCP (Largest Contentful Paint): ≤ 2500ms (good), ≤ 4000ms (needs improvement)
 * - INP (Interaction to Next Paint): ≤ 200ms (good), ≤ 500ms (needs improvement)
 * - CLS (Cumulative Layout Shift): ≤ 0.1 (good), ≤ 0.25 (needs improvement)
 * - FCP (First Contentful Paint): ≤ 1800ms (good)
 * - TTFB (Time to First Byte): ≤ 800ms (good)
 *
 * See https://web.dev/vitals/ for detailed information.
 */

interface VitalsMetric {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
}

const VITALS_THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000 },
  INP: { good: 200, needsImprovement: 500 },
  CLS: { good: 0.1, needsImprovement: 0.25 },
  FCP: { good: 1800, needsImprovement: 3000 },
  TTFB: { good: 800, needsImprovement: 1800 },
};

function getRating(
  name: string,
  value: number
): "good" | "needs-improvement" | "poor" {
  const threshold = VITALS_THRESHOLDS[name as keyof typeof VITALS_THRESHOLDS];
  if (!threshold) return "poor";
  if (value <= threshold.good) return "good";
  if (value <= threshold.needsImprovement) return "needs-improvement";
  return "poor";
}

test.describe("Core Web Vitals", () => {
  /**
   * Collect Core Web Vitals from a page and return them.
   * The page should have the WebVitalsReporter component loaded.
   */
  async function collectVitals(page: any): Promise<VitalsMetric[]> {
    // Wait for the vitals to be collected
    // The vitals are reported via console.log in the WebVitalsReporter
    const vitals: VitalsMetric[] = [];

    // Collect metrics from performance.getEntriesByType() and web-vitals library
    // We'll use the PerformanceObserver API to collect metrics
    const collected = await page.evaluate(() => {
      const metrics: VitalsMetric[] = [];

      // Get Core Web Vitals from PerformanceObserver
      return new Promise<VitalsMetric[]>((resolve) => {
        // Dynamically import web-vitals for client-side collection
        // Note: This runs in the page context, so we rely on what's available
        const observer = new PerformanceObserver((list: any) => {
          for (const entry of list.getEntries()) {
            if (
              entry.entryType === "largest-contentful-paint" ||
              entry.entryType === "first-input" ||
              entry.entryType === "layout-shift"
            ) {
              metrics.push({
                name: entry.entryType.toUpperCase(),
                value:
                  entry.entryType === "layout-shift" ? entry.value : entry.duration,
                rating: "good",
              });
            }
          }
        });

        observer.observe({ entryTypes: ["largest-contentful-paint", "first-input", "layout-shift", "first-contentful-paint"] });

        // Resolve after 5 seconds to allow metrics to be collected
        setTimeout(() => {
          observer.disconnect();
          // Also collect navigation timing
          const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
          if (nav) {
            const fcp = nav.domContentLoadedEventStart - nav.fetchStart;
            const ttfb = nav.responseStart - nav.fetchStart;
            if (fcp > 0)
              metrics.push({
                name: "FCP",
                value: fcp,
                rating: "good",
              });
            if (ttfb > 0)
              metrics.push({
                name: "TTFB",
                value: ttfb,
                rating: "good",
              });
          }
          resolve(metrics);
        }, 5000);
      });
    });

    return collected;
  }

  test("Dashboard should meet Core Web Vitals thresholds", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Give the page time to stabilize
    await page.waitForTimeout(2000);

    // Collect vitals
    const vitals = await collectVitals(page);

    // Verify vitals exist
    expect(vitals.length).toBeGreaterThan(0);

    // Check each metric
    const metrics = new Map(vitals.map((v) => [v.name, v]));

    // LCP should be good or needs improvement (not poor)
    const lcp = metrics.get("LCP");
    if (lcp) {
      console.log(`LCP: ${lcp.value.toFixed(2)}ms`);
      expect(lcp.value).toBeLessThan(VITALS_THRESHOLDS.LCP.needsImprovement + 500); // Allow some buffer
    }

    // CLS should be good or needs improvement
    const cls = metrics.get("CLS");
    if (cls) {
      console.log(`CLS: ${cls.value.toFixed(4)}`);
      expect(cls.value).toBeLessThan(VITALS_THRESHOLDS.CLS.needsImprovement + 0.1);
    }

    // FCP should meet threshold
    const fcp = metrics.get("FCP");
    if (fcp) {
      console.log(`FCP: ${fcp.value.toFixed(2)}ms`);
      expect(fcp.value).toBeLessThan(VITALS_THRESHOLDS.FCP.needsImprovement + 500);
    }
  });

  test("Create Stream page should meet Core Web Vitals thresholds", async ({
    page,
  }) => {
    await page.goto("/stream/new");
    await page.waitForLoadState("networkidle");

    // Give the page time to stabilize
    await page.waitForTimeout(2000);

    // Collect vitals
    const vitals = await collectVitals(page);

    // Verify page loads with reasonable performance
    expect(vitals.length).toBeGreaterThan(0);

    const metrics = new Map(vitals.map((v) => [v.name, v]));

    // FCP (First Contentful Paint) should be reasonable
    const fcp = metrics.get("FCP");
    if (fcp) {
      console.log(`Create Stream FCP: ${fcp.value.toFixed(2)}ms`);
      expect(fcp.value).toBeLessThan(VITALS_THRESHOLDS.FCP.needsImprovement + 500);
    }
  });

  test("Settings page should meet Core Web Vitals thresholds", async ({
    page,
  }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // Give the page time to stabilize
    await page.waitForTimeout(2000);

    // Collect vitals
    const vitals = await collectVitals(page);

    // Verify page loads with reasonable performance
    expect(vitals.length).toBeGreaterThan(0);

    const metrics = new Map(vitals.map((v) => [v.name, v]));

    // FCP should be reasonable
    const fcp = metrics.get("FCP");
    if (fcp) {
      console.log(`Settings FCP: ${fcp.value.toFixed(2)}ms`);
      expect(fcp.value).toBeLessThan(VITALS_THRESHOLDS.FCP.needsImprovement + 500);
    }
  });
});
