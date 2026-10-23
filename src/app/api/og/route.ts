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
import { type NextRequest, NextResponse } from "next/server";

/**
 * Dynamic OG image generation endpoint.
 * Generates a simple text-based OG image for stream sharing.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const streamId = searchParams.get("streamId") || "Stream";
  const amount = searchParams.get("amount") || "0.00";
  const token = searchParams.get("token") || "USDC";

  try {
    // Create a simple SVG-based OG image
    const svg = `
      <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <!-- Background gradient -->
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#111827;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1F2937;stop-opacity:1" />
          </linearGradient>
          <linearGradient id="topGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#10B981;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#059669;stop-opacity:1" />
          </linearGradient>
        </defs>
        
        <!-- Background -->
        <rect width="1200" height="630" fill="url(#grad)"/>
        
        <!-- Top accent bar -->
        <rect width="1200" height="8" fill="url(#topGrad)"/>
        
        <!-- Content area -->
        <g>
          <!-- Logo/Title -->
          <text x="60" y="100" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#10B981">
            SoroStream
          </text>
          
          <!-- Stream ID -->
          <text x="60" y="180" font-family="Arial, sans-serif" font-size="32" fill="#D1D5DB">
            Stream #${streamId}
          </text>
          
          <!-- Amount display -->
          <rect x="60" y="240" width="1080" height="140" rx="12" fill="#111827" stroke="#10B981" stroke-width="2"/>
          <text x="90" y="290" font-family="Arial, sans-serif" font-size="28" fill="#9CA3AF">
            Amount
          </text>
          <text x="90" y="360" font-family="Arial, sans-serif" font-size="56" font-weight="bold" fill="#FFFFFF">
            ${amount} ${token}
          </text>
          
          <!-- Status -->
          <text x="60" y="520" font-family="Arial, sans-serif" font-size="24" fill="#6B7280">
            Real-time payment streaming on Stellar Soroban
          </text>
          
          <!-- Footer -->
          <text x="60" y="600" font-family="Arial, sans-serif" font-size="18" fill="#4B5563">
            sorostream-app.vercel.app
          </text>
        </g>
      </svg>
    `;

    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400", // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error("Error generating OG image:", error);
    // Return a simple fallback image
    return new NextResponse(
      `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="630" fill="#111827"/>
        <text x="600" y="315" font-family="Arial" font-size="48" fill="#10B981" text-anchor="middle" dominant-baseline="middle">
          SoroStream
        </text>
      </svg>`,
      {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=86400",
        },
      }
    );
  }
}
