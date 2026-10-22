"use client";

import { useState } from "react";
import Link from "next/link";
import { NAV_LINKS, BOTTOM_NAV_HREFS } from "@/src/lib/navConstants";

/**
 * Top navigation header with a hamburger drawer for mobile/desktop.
 *
 * DRAWER_LINKS deduplicates against BOTTOM_NAV_HREFS — a single shared
 * constant imported from src/lib/navConstants.ts. This prevents links from
 * silently disappearing or being duplicated across NavHeader's drawer and
 * BottomNav's tab bar when either component is updated.
 *
 * See: __tests__/navDrift.test.ts for the drift test that guards this invariant.
 */

// Filter out links that already appear in the bottom nav bar.
// BOTTOM_NAV_HREFS is the shared source of truth; do not redefine it here.
const DRAWER_LINKS = NAV_LINKS.filter((l) => !BOTTOM_NAV_HREFS.includes(l.href));

export default function NavHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-gray-900 border-b border-gray-700 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-green-400 font-bold text-xl">
          SoroStream
        </Link>

        {/* Desktop nav — shows all links not in bottom nav */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Primary navigation">
          {DRAWER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-gray-300 hover:text-white text-sm transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-gray-400 hover:text-white p-2"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle navigation menu"
          aria-expanded={open}
        >
          <span className="block w-5 h-0.5 bg-current mb-1" />
          <span className="block w-5 h-0.5 bg-current mb-1" />
          <span className="block w-5 h-0.5 bg-current" />
        </button>
      </div>

      {/* Drawer */}
      {open && (
        <nav
          className="md:hidden bg-gray-800 border-t border-gray-700 px-6 py-4 space-y-3"
          aria-label="Mobile navigation drawer"
          data-testid="nav-drawer"
        >
          {DRAWER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block text-gray-300 hover:text-white text-sm py-1"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

// Re-export for consumers that need to inspect drawer links in tests.
export { DRAWER_LINKS };
