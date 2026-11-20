/**
 * #783 — Assert that every component linking to /docs/fees points at the same
 * href, and that the route currently exists on disk.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * AppFooter.tsx and src/app/stream/new/page.tsx both independently hard-code
 * "/docs/fees", which matches the src/app/docs/fees/page.tsx route today.
 * Nothing previously tied these three references together: a route rename
 * would require updating two link sites with no test catching a missed one.
 *
 * Strategy
 * --------
 * 1. Extract the href from each linking component by scanning its source as
 *    text (no rendering required — we only need the string literal).
 * 2. Assert both hrefs equal a single canonical constant.
 * 3. Assert the route file actually exists on disk.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

/** The canonical href both link sites must use. */
const FEES_HREF = "/docs/fees";

/**
 * Corresponding filesystem path: Next.js App Router maps /docs/fees to
 * src/app/docs/fees/page.tsx.
 */
const FEES_PAGE_PATH = resolve(__dirname, "../src/app/docs/fees/page.tsx");

const FOOTER_PATH = resolve(__dirname, "../components/AppFooter.tsx");
const STREAM_NEW_PATH = resolve(__dirname, "../src/app/stream/new/page.tsx");

/** Extract all href/href= string literals matching /docs/fees from a file. */
function extractFeesHrefs(filePath: string): string[] {
  const src = readFileSync(filePath, "utf-8");
  // Match both Next.js Link's href prop and plain <a href="…"> usages.
  const matches = [...src.matchAll(/href=["']([^"']*docs\/fees[^"']*)["']/g)];
  return matches.map((m) => m[1]);
}

describe("fees page link consistency (#783)", () => {
  it("src/app/docs/fees/page.tsx exists", () => {
    expect(
      existsSync(FEES_PAGE_PATH),
      `Route file not found at ${FEES_PAGE_PATH} — the /docs/fees route has been removed or renamed. Update the href in AppFooter.tsx and src/app/stream/new/page.tsx to match, then update FEES_PAGE_PATH in this test.`,
    ).toBe(true);
  });

  it("AppFooter links to the canonical fees href", () => {
    const hrefs = extractFeesHrefs(FOOTER_PATH);
    expect(
      hrefs,
      `No /docs/fees href found in AppFooter.tsx — was the Fee Structure link removed or its href changed?`,
    ).not.toHaveLength(0);
    for (const href of hrefs) {
      expect(
        href,
        `AppFooter.tsx href "${href}" does not match the canonical "${FEES_HREF}". Update it to match, or update FEES_HREF if the route was intentionally renamed.`,
      ).toBe(FEES_HREF);
    }
  });

  it("create-stream page links to the canonical fees href", () => {
    const hrefs = extractFeesHrefs(STREAM_NEW_PATH);
    expect(
      hrefs,
      `No /docs/fees href found in src/app/stream/new/page.tsx — was the "how do fees work?" link removed or its href changed?`,
    ).not.toHaveLength(0);
    for (const href of hrefs) {
      expect(
        href,
        `src/app/stream/new/page.tsx href "${href}" does not match the canonical "${FEES_HREF}". Update it to match, or update FEES_HREF if the route was intentionally renamed.`,
      ).toBe(FEES_HREF);
    }
  });

  it("both link sites use the same href as each other", () => {
    const footerHrefs = extractFeesHrefs(FOOTER_PATH);
    const streamNewHrefs = extractFeesHrefs(STREAM_NEW_PATH);
    // Both must have been found (covered by the individual tests above, but
    // an explicit cross-check here makes the failure message clearer).
    expect(footerHrefs.length).toBeGreaterThan(0);
    expect(streamNewHrefs.length).toBeGreaterThan(0);
    for (const footerHref of footerHrefs) {
      for (const streamHref of streamNewHrefs) {
        expect(
          footerHref,
          `AppFooter.tsx uses "${footerHref}" but src/app/stream/new/page.tsx uses "${streamHref}". Both must use the same href.`,
        ).toBe(streamHref);
      }
    }
  });
});
