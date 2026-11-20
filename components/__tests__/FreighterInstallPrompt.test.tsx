import { describe, it, expect, vi, afterEach } from "vitest";
import { detectBrowser } from "../FreighterInstallPrompt";

/**
 * Tests for FreighterInstallPrompt's detectBrowser helper (#887).
 *
 * Edge ships a UA that contains both "edg/" and "chrome" (Chromium engine /
 * Chrome Web Store compatibility). The function checks "edg/" explicitly as
 * one of the conditions that returns "chrome", so an Edge UA must never fall
 * through to "other".
 */

function withUserAgent(ua: string, fn: () => void) {
  const original = Object.getOwnPropertyDescriptor(navigator, "userAgent");
  Object.defineProperty(navigator, "userAgent", {
    value: ua,
    configurable: true,
  });
  try {
    fn();
  } finally {
    if (original) {
      Object.defineProperty(navigator, "userAgent", original);
    }
  }
}

describe("detectBrowser", () => {
  it("classifies a real Edge (Chromium) UA as 'chrome'", () => {
    withUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
      () => {
        expect(detectBrowser()).toBe("chrome");
      }
    );
  });

  it("classifies a minimal 'edg/' UA as 'chrome' (via edg/ condition)", () => {
    withUserAgent("mozilla/5.0 edg/120.0.0.0", () => {
      expect(detectBrowser()).toBe("chrome");
    });
  });

  it("classifies a Chrome UA as 'chrome'", () => {
    withUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      () => {
        expect(detectBrowser()).toBe("chrome");
      }
    );
  });

  it("classifies a Firefox UA as 'firefox'", () => {
    withUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
      () => {
        expect(detectBrowser()).toBe("firefox");
      }
    );
  });

  it("classifies a Firefox iOS (FxiOS) UA as 'firefox'", () => {
    withUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/124.0 Mobile/15E148 Safari/604.1",
      () => {
        expect(detectBrowser()).toBe("firefox");
      }
    );
  });

  it("classifies a Brave UA as 'chrome'", () => {
    withUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Brave/124",
      () => {
        expect(detectBrowser()).toBe("chrome");
      }
    );
  });

  it("classifies an unknown UA as 'other'", () => {
    withUserAgent("SomeObscureBrowser/1.0", () => {
      expect(detectBrowser()).toBe("other");
    });
  });

  it("does not misclassify Edge as 'other' even without 'chrome' in the UA", () => {
    // Hypothetical future Edge UA that only contains "edg/"
    withUserAgent("mozilla/5.0 (windows nt 10.0) edg/200.0.0.0", () => {
      expect(detectBrowser()).not.toBe("other");
      expect(detectBrowser()).toBe("chrome");
    });
  });
});
