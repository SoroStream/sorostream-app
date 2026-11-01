import { describe, expect, it } from "vitest";
import { GET } from "./route";
import { OG_SECURITY_HEADERS } from "@/src/lib/ogSecurityHeaders";
import type { NextRequest } from "next/server";

function makeRequest(query = ""): NextRequest {
  return { url: `https://example.test/api/og${query}` } as NextRequest;
}

describe("GET /api/og", () => {
  it("escapes query values before inserting them into SVG text", async () => {
    const request = {
      url: "https://example.test/api/og?streamId=%3C%2Ftext%3E%3Cscript%3Ealert(1)%3C%2Fscript%3E&amount=5%26%3Csvg%3E&token=%22%27%3E",
    } as NextRequest;

    const response = await GET(request);
    const svg = await response.text();

    expect(svg).toContain("&lt;/text&gt;&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(svg).toContain("5&amp;&lt;svg&gt;");
    expect(svg).toContain("&quot;&apos;&gt;");
    expect(svg).not.toContain("<script>");
  });

  /**
   * SVG can embed scripts; a user opening this URL directly (not just
   * crawlers, which rasterise it) would execute them. These headers are
   * defense-in-depth beyond the escaping above (issue #781).
   */
  it("sets X-Content-Type-Options: nosniff", async () => {
    const response = await GET(makeRequest());
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("sets a Content-Security-Policy blocking script execution", async () => {
    const response = await GET(makeRequest());
    const csp = response.headers.get("Content-Security-Policy") ?? "";
    expect(csp).toContain("default-src 'none'");
    // Standard SVG style attributes (fill, stroke, ...) must still render.
    expect(csp).toContain("style-src 'unsafe-inline'");
  });

  it("OG_SECURITY_HEADERS contains both required headers", () => {
    expect(OG_SECURITY_HEADERS["X-Content-Type-Options"]).toBe("nosniff");
    expect(OG_SECURITY_HEADERS["Content-Security-Policy"]).toContain(
      "default-src 'none'"
    );
  });

  it("returns Content-Type: image/svg+xml", async () => {
    const response = await GET(makeRequest());
    expect(response.headers.get("Content-Type")).toContain("image/svg+xml");
  });
});
