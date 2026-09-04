/**
 * Tests for #453: Mobile responsive dashboard layout.
 * Verifies that the correct responsive Tailwind classes are present in the
 * relevant source files, without fully rendering the heavy components.
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, it, expect } from "vitest";

const ROOT = resolve(__dirname, "../..");

function readSrc(rel: string) {
  return readFileSync(resolve(ROOT, rel), "utf8");
}

describe("#453 — Mobile responsive layout classes", () => {
  describe("Dashboard page responsive classes", () => {
    const dashSrc = readSrc("src/app/dashboard/page.tsx");

    it("uses flex-wrap in the dashboard header so buttons wrap on mobile", () => {
      expect(dashSrc).toMatch(/flex-wrap/);
    });

    it("uses sm:grid-cols-1 md:grid-cols-2 for the stream skeleton grid (single column on mobile)", () => {
      expect(dashSrc).toMatch(/sm:grid-cols-1 md:grid-cols-2/);
    });

    it("uses min-w-0 w-full on the search input to prevent overflow on mobile", () => {
      expect(dashSrc).toMatch(/min-w-0 w-full/);
    });

    it("reduces horizontal padding on the main container for mobile (p-4 sm:p-6)", () => {
      expect(dashSrc).toMatch(/p-4 sm:p-6/);
    });

    it("has a collapsible filter bar toggle (showFilterBar) for smaller screens", () => {
      expect(dashSrc).toMatch(/showFilterBar/);
      expect(dashSrc).toMatch(/Toggle filter bar/);
    });

    it("has j/k stream navigation shortcuts registered", () => {
      expect(dashSrc).toMatch(/"j"/);
      expect(dashSrc).toMatch(/"k"/);
      expect(dashSrc).toMatch(/Next stream/);
      expect(dashSrc).toMatch(/Previous stream/);
    });
  });

  describe("NavHeader responsive classes", () => {
    const navSrc = readSrc("components/NavHeader.tsx");

    it("hides the USD toggle button on mobile (hidden sm:block)", () => {
      expect(navSrc).toMatch(/hidden sm:block/);
    });

    it("hides the balance on mobile (hidden md:inline-block)", () => {
      expect(navSrc).toMatch(/hidden md:inline-block/);
    });

    it("uses gap-2 (tighter than gap-3) for mobile header spacing", () => {
      expect(navSrc).toMatch(/gap-2/);
    });
  });

  describe("RecipientQrInline responsive classes", () => {
    const qrSrc = readSrc("components/RecipientQrInline.tsx");

    it("uses break-all on the address text to prevent overflow on narrow screens", () => {
      expect(qrSrc).toMatch(/break-all/);
    });

    it("uses max-w to constrain the address text width", () => {
      expect(qrSrc).toMatch(/max-w-/);
    });
  });

  describe("StreamVirtualList responsive grid", () => {
    const listSrc = readSrc("components/StreamVirtualList.tsx");

    it("highlights focused stream with a ring class for keyboard navigation", () => {
      expect(listSrc).toMatch(/ring-2 ring-green-500/);
    });

    it("accepts and uses focusedStreamId prop", () => {
      expect(listSrc).toMatch(/focusedStreamId/);
    });
  });
});
