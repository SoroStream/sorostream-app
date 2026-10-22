"use client";

import Link from "next/link";
import { NAV_LINKS, BOTTOM_NAV_HREFS } from "@/src/lib/navConstants";

/**
 * Mobile bottom navigation bar.
 *
 * Renders only the links whose hrefs appear in BOTTOM_NAV_HREFS — the shared
 * constant defined in src/lib/navConstants.ts. NavHeader's drawer filters
 * those same hrefs out to avoid duplication.
 *
 * IMPORTANT: Do NOT define a local copy of the bottom-nav href list here.
 * Editing the list in one place without updating the other is exactly the
 * drift bug this design prevents. See feat/778 for background.
 *
 * See: __tests__/navDrift.test.ts for the drift test that guards this invariant.
 */

// Derive BottomNav links from the single shared source of truth.
const BOTTOM_NAV_LINKS = NAV_LINKS.filter((l) => BOTTOM_NAV_HREFS.includes(l.href));

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 md:hidden z-50"
      aria-label="Bottom navigation"
      data-testid="bottom-nav"
    >
      <div className="flex">
        {BOTTOM_NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex-1 py-3 text-center text-xs text-gray-400 hover:text-white transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

// Re-export for consumers that need to inspect rendered hrefs in tests.
export { BOTTOM_NAV_LINKS };
