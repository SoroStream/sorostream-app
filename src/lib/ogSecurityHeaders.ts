/**
 * Security headers for the OG image API route (src/app/api/og/route.ts).
 *
 * Extracted to a separate module because Next.js route files only permit
 * specific named exports (GET, POST, etc. and a handful of route-config keys).
 * Exporting any other name from a route file causes a build-time type error.
 *
 * Both the route handler and the test import from here so header values stay
 * in a single place.
 *
 * WHY THESE HEADERS MATTER FOR A DYNAMIC SVG RESPONSE
 * -----------------------------------------------------
 * SVG is XML that can contain embedded JavaScript (<script> tags, event
 * handlers, etc.). Social-media crawlers rasterise SVGs, so scripts are
 * never executed in that context. But if a user opens the OG URL directly in
 * a browser tab, the browser WILL execute embedded scripts — making this
 * route a potential XSS vector if user-controlled query params are ever
 * interpolated without escaping.
 *
 * These headers provide defense-in-depth beyond input escaping:
 *
 *   X-Content-Type-Options: nosniff
 *     Prevents browsers from MIME-sniffing the response away from
 *     "image/svg+xml". Without this, some browsers might interpret the SVG
 *     as "text/html" and execute its content in a much more permissive
 *     context.
 *
 *   Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'
 *     If the SVG is opened as a document in a browser tab, this CSP blocks
 *     all script execution and external resource loading. Only inline styles
 *     (standard SVG attributes like fill and stroke) are permitted.
 *
 * Cross-reference: See the escapeXml helper in the route file for the input
 * sanitisation that these headers complement.
 *
 * See: feat/781 — CSP/sandboxing guidance for the OG image route
 * Test: __tests__/ogRoute.test.ts
 */
export const OG_SECURITY_HEADERS = {
  /**
   * Prevent MIME-type sniffing — ensures browsers honour "image/svg+xml"
   * and do not try to interpret the SVG as HTML.
   */
  "X-Content-Type-Options": "nosniff",

  /**
   * Restrict what can execute if the SVG is opened directly in a browser tab.
   *
   * - default-src 'none'        — block all content by default.
   * - style-src 'unsafe-inline' — allow inline SVG style attributes
   *   (fill, stroke, font properties) which are standard in SVG.
   *
   * If you ever need to load an external web font for preview text, add
   * it explicitly here rather than widening default-src.
   */
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
} as const;
