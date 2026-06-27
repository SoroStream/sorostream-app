"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NetworkSelector from "@/components/NetworkSelector";
import WalletConnect from "@/components/WalletConnect";
import ThemeToggle from "@/components/ThemeToggle";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/stream/new", label: "Create" },
];

export default function NavHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors ${
        scrolled ? "border-gray-700 bg-gray-900/95 backdrop-blur" : "border-gray-800 bg-gray-900"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold text-green-400 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900">
            SoroStream
          </Link>
          <nav className="hidden sm:flex items-center gap-4" aria-label="Main navigation">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`text-sm transition-colors rounded-md px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${
                    isActive ? "text-white font-medium" : "text-gray-300 hover:text-white"
                  }`}
                >
                  {link.label}
                  {isActive && <span className="ml-1 inline-block h-1 w-1 rounded-full bg-green-400" aria-hidden="true" />}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <NetworkSelector />
          <WalletConnect />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
