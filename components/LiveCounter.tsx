"use client";

import { useEffect, useState } from "react";
import FiatDisplay from "@/components/FiatDisplay";

interface LiveCounterProps {
  flowRate: number;
  lastWithdrawTime: Date;
}

export default function LiveCounter({ flowRate, lastWithdrawTime }: LiveCounterProps) {
  const [claimable, setClaimable] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = (Date.now() - new Date(lastWithdrawTime).getTime()) / 1000;
      setClaimable(flowRate * elapsed);
    }, 1000);
    return () => clearInterval(interval);
  }, [flowRate, lastWithdrawTime]);

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
