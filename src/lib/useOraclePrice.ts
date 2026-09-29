"use client";
/**
 * useOraclePrice — reads a token's USD price from the on-chain price oracle
 * (simulated via getOraclePrice). Returns the latest price and a loading flag.
 *
 * Unlike the off-chain CoinGecko feed used by FiatDisplay, this source
 * represents the contract oracle that stream creation previews rely on.
 */
import { useEffect, useState } from "react";
import { getOraclePrice } from "./sorostream";

/**
 * Fetch the on-chain oracle price for a token.
 *
 * @param {string} token - Token symbol or contract ID to price.
 * @returns {{ price: number | null; loading: boolean }} Latest price (`null` if unavailable) and loading flag.
 */
export function useOraclePrice(token: string): { price: number | null; loading: boolean } {
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const p = await getOraclePrice(token);
      if (!cancelled) {
        setPrice(p);
        setLoading(false);
      }
    }

    void refresh();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return { price, loading };
}
