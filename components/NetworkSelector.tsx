"use client";
import { useNetwork } from "@/src/lib/network";

export default function NetworkSelector() {
  const { network, setNetwork } = useNetwork();

  return (
    <button
      onClick={() => setNetwork(network === "testnet" ? "mainnet" : "testnet")}
      className={`text-xs px-2.5 py-1 rounded-full border transition-colors font-medium ${
        network === "testnet"
          ? "bg-yellow-900/40 border-yellow-600/50 text-yellow-400 hover:bg-yellow-900/60"
          : "bg-green-900/40 border-green-600/50 text-green-400 hover:bg-green-900/60"
      }`}
      title={`Current: ${network}. Click to switch to ${network === "testnet" ? "mainnet" : "testnet"}`}
    >
      {network === "testnet" ? "Testnet" : "Mainnet"}
    </button>
  );
}
