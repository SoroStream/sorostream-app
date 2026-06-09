"use client";

import { useEffect, useRef, useState } from "react";

interface LiveCounterProps {
  /** Initial claimable amount in stroops. */
  initialStroops: bigint;
  /** Flow rate in stroops per second. */
  flowRatePerSecond: bigint;
  /** Stream end time as a Unix timestamp. */
  endTime: number;
}

/**
 * Real-time ticking USDC counter that increments every second
 * based on the stream's flow rate.
 */
export default function LiveCounter({
  initialStroops,
  flowRatePerSecond,
  endTime,
}: LiveCounterProps) {
  const [claimable, setClaimable] = useState(initialStroops);
  const startRef = useRef(Date.now());
  const startValueRef = useRef(initialStroops);

  useEffect(() => {
    startRef.current = Date.now();
    startValueRef.current = initialStroops;

    const id = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const effectiveNow = Math.min(now, endTime);
      const elapsedSinceMount = Math.max(
        0,
        effectiveNow - Math.floor(startRef.current / 1000)
      );
      setClaimable(startValueRef.current + flowRatePerSecond * BigInt(elapsedSinceMount));
    }, 1000);

    return () => clearInterval(id);
  }, [initialStroops, flowRatePerSecond, endTime]);

  return (
    <span
      className="font-mono text-green-600 font-semibold tabular-nums"
      aria-live="polite"
      aria-label={`Claimable: ${formatUSDC(claimable)} USDC`}
    >
      {formatUSDC(claimable)} USDC
    </span>
  );
}
