import { describe, expect, it } from "vitest";
import { GET } from "./route";
import type { NextRequest } from "next/server";

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
});
