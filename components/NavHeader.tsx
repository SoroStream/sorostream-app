"use client";
import Link from "next/link";
import NetworkSelector from "@/components/NetworkSelector";
import WalletConnect from "@/components/WalletConnect";

export default function NavHeader() {
  return (
    <header className="border-b border-gray-800">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-green-400">
          SoroStream
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">
            Dashboard
          </Link>
          <NetworkSelector />
          <WalletConnect />
        </nav>
      </div>
    </header>
  );
}
