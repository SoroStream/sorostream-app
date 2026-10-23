/**
 * @jest-environment node
 *
 * OG image route security-header test for issue #781.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * src/app/api/og/route.ts returns image/svg+xml. SVG is a format that can
 * contain embedded scripts and event handlers. Although social platforms
 * rasterise SVGs before displaying them (so scripts never run in that
 * context), a user or attacker who opens the URL directly in a browser tab
 * WILL have scripts executed if any are present.
 *
 * Two defense-in-depth headers reduce the blast radius if input escaping is
 * ever accidentally removed:
 *
 *   X-Content-Type-Options: nosniff
 *     Prevents browsers from MIME-sniffing the response type away from
 *     "image/svg+xml", ensuring the SVG isn't interpreted as HTML.
 *
 *   Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'
 *     If the SVG is opened as a document in a browser tab, the CSP blocks
 *     all script execution, external resource loading, and network requests.
 *     Only inline styles (standard in SVG) are permitted.
 *
 * Cross-reference: See the related SVG-injection escaping fix in the route
 * handler (escapeXml) for the input sanitisation that these headers
 * complement. The headers are last-resort protection; escaping is primary.
 *
 * See: feat/781 — CSP/sandboxing for OG image route
 * Header definitions: src/lib/ogSecurityHeaders.ts
 */

import { GET } from "../src/app/api/og/route";
import { OG_SECURITY_HEADERS } from "../src/lib/ogSecurityHeaders";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/og");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url.toString());
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("OG image route security headers (#781)", () => {
  /**
   * X-Content-Type-Options: nosniff must be present on every response.
   * This prevents MIME-sniffing the SVG as HTML.
   */
  it("sets X-Content-Type-Options: nosniff", async () => {
    const response = await GET(makeRequest());
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  /**
   * Content-Security-Policy must be present and must include
   * "default-src 'none'" to block all script execution.
   */
  it("sets Content-Security-Policy with default-src none", async () => {
    const response = await GET(makeRequest());
    const csp = response.headers.get("Content-Security-Policy") ?? "";

    expect(csp).toContain("default-src 'none'");
  });

  /**
   * The CSP must allow inline styles so that standard SVG style attributes
   * (fill, stroke, etc.) continue to work.
   */
  it("CSP permits inline styles for SVG attributes", async () => {
    const response = await GET(makeRequest());
    const csp = response.headers.get("Content-Security-Policy") ?? "";

    expect(csp).toContain("style-src 'unsafe-inline'");
  });

  /**
   * OG_SECURITY_HEADERS constant must contain both required headers so that
   * future callers that spread the constant get both without needing to
   * remember individual header names.
   */
  it("OG_SECURITY_HEADERS constant contains both required headers", () => {
    expect(OG_SECURITY_HEADERS["X-Content-Type-Options"]).toBe("nosniff");
    expect(OG_SECURITY_HEADERS["Content-Security-Policy"]).toContain(
      "default-src 'none'"
    );
  });

  /**
   * User-supplied title and description must be XML-escaped in the SVG body
   * to prevent SVG injection. This test confirms the most dangerous
   * characters (<, >, &, ", ') are escaped.
   */
  it("escapes XML special characters in interpolated values", async () => {
    const response = await GET(
      makeRequest({
        title: '<script>alert("xss")</script>',
        description: "foo & bar",
      })
    );
    const body = await response.text();

    // The raw characters must not appear unescaped in the SVG body.
    expect(body).not.toContain("<script>");
    expect(body).not.toContain('alert("xss")');
    // Escaped forms must be present.
    expect(body).toContain("&lt;script&gt;");
    expect(body).toContain("foo &amp; bar");
  });

  /**
   * The route must return the correct Content-Type so that browsers and
   * social crawlers know to interpret the body as SVG.
   */
  it("returns Content-Type: image/svg+xml", async () => {
    const response = await GET(makeRequest({ title: "Test Stream" }));
    expect(response.headers.get("Content-Type")).toContain("image/svg+xml");
  });

  /**
   * Default values must be used when query parameters are absent so that
   * the route never returns an empty or broken SVG.
   */
  it("renders default title and description when params are absent", async () => {
    const response = await GET(makeRequest());
    const body = await response.text();

    expect(body).toContain("SoroStream");
    expect(body).toContain("Stellar Soroban");
  });
});
