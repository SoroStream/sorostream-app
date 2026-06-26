"use client";

import { useEffect, useState } from "react";
import FiatDisplay from "@/components/FiatDisplay";
import { sorostream } from "@/src/lib/sorostream";

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

function parseClaimable(value: string | number | bigint) {
  const amount = typeof value === "bigint" ? Number(value) : Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

export default function LiveCounter({
  flowRate,
  lastWithdrawTime,
  streamId,
  reconcileIntervalMs = DEFAULT_RECONCILE_INTERVAL_MS,
}: LiveCounterProps) {
  const [baseline, setBaseline] = useState(() => ({
    amount: getEstimatedClaimable(flowRate, lastWithdrawTime),
    timestamp: Date.now(),
  }));
  const [claimable, setClaimable] = useState(() => getEstimatedClaimable(flowRate, lastWithdrawTime));

  useEffect(() => {
    const nextBaseline = {
      amount: getEstimatedClaimable(flowRate, lastWithdrawTime),
      timestamp: Date.now(),
    };
    setBaseline(nextBaseline);
    setClaimable(nextBaseline.amount);
  }, [flowRate, lastWithdrawTime]);

  useEffect(() => {
    let cancelled = false;

    async function reconcileClaimable() {
      if (!streamId) return;

      try {
        const onChainClaimable = parseClaimable(await sorostream.getClaimable(streamId));
        if (cancelled || onChainClaimable === null) return;

        const nextBaseline = {
          amount: onChainClaimable,
          timestamp: Date.now(),
        };
        setBaseline(nextBaseline);
        setClaimable(nextBaseline.amount);
      } catch {
        // Keep the local interpolation running if the chain read is temporarily unavailable.
      }
    }

    void reconcileClaimable();
    const interval = setInterval(reconcileClaimable, reconcileIntervalMs);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [streamId, reconcileIntervalMs]);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = (Date.now() - baseline.timestamp) / 1000;
      setClaimable(Math.max(0, baseline.amount + flowRate * elapsed));
    }, 1000);
    return () => clearInterval(interval);
  }, [baseline, flowRate]);

  const formatUSDC = (val: number) => (val / 10000000).toFixed(7);

  return (
    <span
      className="font-mono text-green-600 font-semibold tabular-nums"
      role="status"
      aria-live="polite"
      aria-label={`Claimable: ${formatUSDC(claimable)} USDC`}
    >
      {formatUSDC(claimable)} USDC{" "}
      <FiatDisplay usdcAmount={claimable / 10000000} />
    </span>
  );
}
