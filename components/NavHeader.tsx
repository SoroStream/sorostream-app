"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NetworkSelector from "@/components/NetworkSelector";
import WalletConnect from "@/components/WalletConnect";
import ThemeToggle from "@/components/ThemeToggle";
import ChangelogModal, { useChangelogUnread } from "@/components/ChangelogModal";
import { useSettings } from "@/src/context/SettingsContext";
import { useWallet } from "@/src/context/WalletContext";
import { APP_NETWORK } from "@/src/lib/freighter";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/stream/new", label: "Create" },
  { href: "/settings", label: "Settings" },
];

const HORIZON_URL =
  APP_NETWORK === "public" || APP_NETWORK === "mainnet"
    ? "https://horizon.stellar.org"
    : APP_NETWORK === "futurenet"
    ? "https://horizon-futurenet.stellar.org"
    : "https://horizon-testnet.stellar.org";

export default function NavHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const { showUsd, toggleShowUsd } = useSettings();
  const { address } = useWallet();
  const [xlmBalance, setXlmBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const changelogUnread = useChangelogUnread();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const fetchBalance = useCallback(async (addr: string) => {
    setBalanceLoading(true);
    try {
      const res = await fetch(`${HORIZON_URL}/accounts/${addr}`);
      if (!res.ok) throw new Error(`Horizon ${res.status}`);
      const data = await res.json() as { balances?: { asset_type: string; balance: string }[] };
      const native = data.balances?.find((b) => b.asset_type === "native");
      setXlmBalance(native ? parseFloat(native.balance).toFixed(2) : null);
    } catch {
      setXlmBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!address) {
      setXlmBalance(null);
      return;
    }
    void fetchBalance(address);
    const interval = setInterval(() => void fetchBalance(address), 60_000);
    return () => clearInterval(interval);
  }, [address, fetchBalance]);

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
          {address && (
            <span
              className="text-xs text-gray-300 font-mono hidden sm:inline-block"
              aria-label="Wallet XLM balance"
            >
              {balanceLoading && xlmBalance === null ? (
                <span className="inline-block w-16 h-3 bg-gray-700 rounded animate-pulse" aria-hidden="true" />
              ) : xlmBalance !== null ? (
                `${xlmBalance} XLM`
              ) : null}
            </span>
          )}
          <WalletConnect />
          <button
            onClick={toggleShowUsd}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              showUsd
                ? "border-green-600 text-green-400 hover:bg-green-900/30"
                : "border-gray-600 text-gray-400 hover:bg-gray-700"
            }`}
            aria-pressed={showUsd}
            title={showUsd ? "Hide USD values" : "Show USD values"}
          >
            {showUsd ? "USD ✓" : "USD"}
          </button>
          <button
            onClick={() => setChangelogOpen(true)}
            className="relative text-gray-400 hover:text-white transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 p-1"
            aria-label={changelogUnread ? "What's new (unread updates)" : "What's new"}
            title="What's new"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {changelogUnread && (
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-green-400 rounded-full" aria-hidden="true" />
            )}
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
    <ChangelogModal open={changelogOpen} onClose={() => setChangelogOpen(false)} />
  );
}
