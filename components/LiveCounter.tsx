"use client";

import { useEffect, useState } from "react";
import FiatDisplay from "@/components/FiatDisplay";
import { sorostream } from "@/src/lib/sorostream";
import { useRpcFetch } from "@/src/lib/useRpcFetch";

interface LiveCounterProps {
  flowRate: number;
  lastWithdrawTime: Date;
  streamId?: string;
  reconcileIntervalMs?: number;
}

const DEFAULT_RECONCILE_INTERVAL_MS = 30_000;

function getEstimatedClaimable(flowRate: number, lastWithdrawTime: Date) {
  const elapsed = (Date.now() - new Date(lastWithdrawTime).getTime()) / 1000;
  return Math.max(0, flowRate * elapsed);
}

function parseClaimable(value: string | number | bigint): number | null {
  const amount = typeof value === "bigint" ? Number(value) : Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

export default function LiveCounter({
  flowRate,
  lastWithdrawTime,
  streamId,
  reconcileIntervalMs = DEFAULT_RECONCILE_INTERVAL_MS,
}: LiveCounterProps) {
  const rpcFetch = useRpcFetch();

  const [baseline, setBaseline] = useState(() => ({
    amount: getEstimatedClaimable(flowRate, lastWithdrawTime),
    timestamp: Date.now(),
  }));
  const [claimable, setClaimable] = useState(() =>
    getEstimatedClaimable(flowRate, lastWithdrawTime),
  );

  // Reset baseline when props change (e.g. after a withdrawal).
  useEffect(() => {
    const next = {
      amount: getEstimatedClaimable(flowRate, lastWithdrawTime),
      timestamp: Date.now(),
    };
    setBaseline(next);
    setClaimable(next.amount);
  }, [flowRate, lastWithdrawTime]);

  // Periodically reconcile against the chain value, with rate-limit handling.
  useEffect(() => {
    let cancelled = false;

    async function reconcileClaimable() {
      if (!streamId) return;

      try {
        const onChainClaimable = parseClaimable(
          await rpcFetch(() => sorostream.getClaimable(streamId)),
        );
        if (cancelled || onChainClaimable === null) return;

        const next = { amount: onChainClaimable, timestamp: Date.now() };
        setBaseline(next);
        setClaimable(next.amount);
      } catch {
        // Keep local interpolation running if the chain read fails permanently.
      }
    }

    void reconcileClaimable();
    const interval = setInterval(reconcileClaimable, reconcileIntervalMs);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [streamId, reconcileIntervalMs, rpcFetch]);

  // Interpolate locally at 1-second resolution.
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = (Date.now() - baseline.timestamp) / 1000;
      setClaimable(Math.max(0, baseline.amount + flowRate * elapsed));
    }, 1_000);
    return () => clearInterval(interval);
  }, [baseline, flowRate]);

  /** Format stroops as XLM with 7 decimal places. */
  const formatXlm = (val: number) => (val / 10_000_000).toFixed(7);
  const xlmAmount = claimable / 10_000_000;

  return (
    <span
      className="font-mono text-green-600 font-semibold tabular-nums"
      role="status"
      aria-live="polite"
      aria-label={`Claimable: ${formatXlm(claimable)} XLM`}
    >
      {formatXlm(claimable)} XLM{" "}
      <FiatDisplay xlmAmount={xlmAmount} />
    </span>
  );
}
