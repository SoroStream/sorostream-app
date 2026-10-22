import { NextRequest, NextResponse } from "next/server";
import { OG_SECURITY_HEADERS } from "@/src/lib/ogSecurityHeaders";

/**
 * OG image route — dynamically generated SVG for Open Graph / social previews.
 *
 * SECURITY HEADERS
 * ----------------
 * This route applies X-Content-Type-Options and a restrictive Content-Security-
 * Policy to every response. See src/lib/ogSecurityHeaders.ts for the full
 * explanation of why these headers matter specifically for a dynamically-
 * generated SVG response, and how they complement the XML-escaping in this file.
 *
 * Cross-reference: feat/781 — CSP/sandboxing guidance for the OG image route.
 * Test: __tests__/ogRoute.test.ts
 */

/** Escape the five XML special characters to prevent SVG injection. */
function escapeXml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;

  // Read interpolated values — escape each one to neutralise SVG injection.
  const title = escapeXml(searchParams.get("title") ?? "SoroStream");
  const description = escapeXml(
    searchParams.get("description") ??
      "Real-time USDC payment streaming on Stellar Soroban"
  );
  const amount = escapeXml(searchParams.get("amount") ?? "");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="1200"
  height="630"
  viewBox="0 0 1200 630"
>
  <!-- Background -->
  <rect width="1200" height="630" fill="#111827"/>

  <!-- Top accent line -->
  <rect x="0" y="0" width="1200" height="4" fill="#22c55e"/>

  <!-- Logo text -->
  <text
    x="80"
    y="100"
    font-family="system-ui, sans-serif"
    font-size="32"
    font-weight="700"
    fill="#22c55e"
  >SoroStream</text>

  <!-- Title -->
  <text
    x="80"
    y="280"
    font-family="system-ui, sans-serif"
    font-size="64"
    font-weight="700"
    fill="#ffffff"
  >${title}</text>

  <!-- Description -->
  <text
    x="80"
    y="360"
    font-family="system-ui, sans-serif"
    font-size="28"
    fill="#9ca3af"
  >${description}</text>

  ${
    amount
      ? `<!-- Amount badge -->
  <rect x="80" y="420" width="320" height="64" rx="12" fill="#14532d"/>
  <text
    x="240"
    y="462"
    font-family="system-ui, sans-serif"
    font-size="28"
    font-weight="700"
    fill="#22c55e"
    text-anchor="middle"
  >${amount} USDC</text>`
      : ""
  }

  <!-- Footer -->
  <text
    x="80"
    y="580"
    font-family="system-ui, sans-serif"
    font-size="22"
    fill="#4b5563"
  >sorostream-app.vercel.app</text>
</svg>`;

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      // Cache for 10 minutes on CDN — short enough that title/description
      // changes appear quickly, long enough to absorb crawler traffic.
      "Cache-Control": "public, max-age=600, s-maxage=600",
      // ---- Security headers ----
      // See src/lib/ogSecurityHeaders.ts for the full explanation.
      ...OG_SECURITY_HEADERS,
    },
  });
}
