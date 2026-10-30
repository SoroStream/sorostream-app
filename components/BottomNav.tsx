"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

// SVG icons for each nav destination
function DashboardIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" fill={active ? "currentColor" : "none"} />
      <rect x="14" y="3" width="7" height="7" rx="1" fill={active ? "currentColor" : "none"} />
      <rect x="3" y="14" width="7" height="7" rx="1" fill={active ? "currentColor" : "none"} />
      <rect x="14" y="14" width="7" height="7" rx="1" fill={active ? "currentColor" : "none"} />
    </svg>
  );
}

function CreateIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

function AddressBookIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path
        d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
        fill={active ? "currentColor" : "none"}
      />
    </svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" fill={active ? "currentColor" : "none"} />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function MoreIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="4" y1="6" x2="20" y2="6" strokeWidth={active ? "2.5" : "2"} />
      <line x1="4" y1="12" x2="20" y2="12" strokeWidth={active ? "2.5" : "2"} />
      <line x1="4" y1="18" x2="20" y2="18" strokeWidth={active ? "2.5" : "2"} />
    </svg>
  );
}

/** Routes shown inside the "More" drawer — everything not reachable from the 4 primary tabs. */
const MORE_LINKS = [
  { href: "/analytics", label: "Analytics" },
  { href: "/activity", label: "Activity" },
  { href: "/stats", label: "Stats" },
  { href: "/stream/batch", label: "Batch Streams" },
  { href: "/admin", label: "Admin" },
  { href: "/archive", label: "Archive" },
] as const;

/** Hrefs covered by the More drawer — used to highlight the More button when
 *  the user is on one of those pages. */
const MORE_HREFS = MORE_LINKS.map((l) => l.href);

export default function BottomNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the drawer whenever the user navigates to a new page.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Close drawer on Escape key.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const isMoreActive = MORE_HREFS.some(
    (href) => pathname === href || pathname.startsWith(href + "/"),
  );

  return (
    <>
      {/*
       * Safe-area spacer: pushes page content above the bottom nav on iOS
       * and Android devices with a home indicator. The nav itself is fixed,
       * so we reserve exactly the same height in the document flow.
       */}
      <div className="h-16 md:hidden" aria-hidden="true" />

      {/* More drawer overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[55] md:hidden" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="More navigation options"
            className="absolute bottom-16 inset-x-0 bg-gray-900 border-t border-gray-700 rounded-t-2xl shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-200">More</span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="p-1 text-gray-400 hover:text-white rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                  aria-label="Close more menu"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <ul className="grid grid-cols-2 gap-2" role="list">
                {MORE_LINKS.map(({ href, label }) => {
                  const isActive = pathname === href || pathname.startsWith(href + "/");
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        aria-current={isActive ? "page" : undefined}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
                          isActive
                            ? "bg-gray-700 text-green-400"
                            : "text-gray-300 hover:bg-gray-800 hover:text-white"
                        }`}
                      >
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}

      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-gray-900/95 backdrop-blur border-t border-gray-800 safe-bottom"
      >
        <ul className="flex items-stretch h-16" role="list">
          {/* Dashboard */}
          <li className="flex-1">
            <NavLink
              href="/dashboard"
              label="Dashboard"
              isActive={
                pathname === "/dashboard" ||
                (pathname.startsWith("/stream/") &&
                  pathname !== "/stream/new" &&
                  pathname !== "/stream/batch")
              }
              icon={(active) => <DashboardIcon active={active} />}
            />
          </li>

          {/* Create — prominent centre pill */}
          <li className="flex-1">
            <NavLink
              href="/stream/new"
              label="Create"
              isActive={pathname === "/stream/new"}
              icon={() => <CreateIcon />}
              isCreate
            />
          </li>

          {/* Contacts / Address Book */}
          <li className="flex-1">
            <NavLink
              href="/address-book"
              label="Contacts"
              isActive={pathname === "/address-book"}
              icon={(active) => <AddressBookIcon active={active} />}
            />
          </li>

          {/* Settings */}
          <li className="flex-1">
            <NavLink
              href="/settings"
              label="Settings"
              isActive={pathname === "/settings" || pathname.startsWith("/settings/")}
              icon={(active) => <SettingsIcon active={active} />}
            />
          </li>

          {/* More — opens a drawer with Analytics, Activity, Stats, Batch, Admin, Archive */}
          <li className="flex-1">
            <button
              type="button"
              aria-expanded={drawerOpen}
              aria-haspopup="dialog"
              aria-label="More navigation options"
              onClick={() => setDrawerOpen((prev) => !prev)}
              className={`
                flex flex-col items-center justify-center gap-1 h-full w-full text-[10px] font-medium
                transition-colors min-h-11 min-w-11
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-inset
                ${isMoreActive || drawerOpen ? "text-green-400" : "text-gray-400 hover:text-gray-200"}
              `}
            >
              <MoreIcon active={isMoreActive || drawerOpen} />
              <span>More</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}

interface NavLinkProps {
  href: string;
  label: string;
  isActive: boolean;
  icon: (active: boolean) => React.ReactNode;
  isCreate?: boolean;
}

function NavLink({ href, label, isActive, icon, isCreate }: NavLinkProps) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`
        flex flex-col items-center justify-center gap-1 h-full w-full text-[10px] font-medium
        transition-colors min-h-11 min-w-11
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-inset
        ${
          isCreate
            ? "text-green-400"
            : isActive
            ? "text-green-400"
            : "text-gray-400 hover:text-gray-200"
        }
      `}
    >
      <span
        className={`
          flex items-center justify-center rounded-full transition-colors
          ${isCreate ? "bg-green-700 text-white w-11 h-11 -mt-5 shadow-lg shadow-green-900/50" : ""}
        `}
      >
        {icon(isActive)}
      </span>
      <span className={isCreate ? "mt-1" : ""}>{label}</span>
    </Link>
  );
}
