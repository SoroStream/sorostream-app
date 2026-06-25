"use client";
import { useState } from "react";
import LiveCounter from "@/components/LiveCounter";
import { sorostream } from "@/src/lib/sorostream";
import { useToast } from "@/src/lib/toast";

interface StreamActionsProps {
  streamId: string;
  flowRate: number;
  lastWithdrawTime: string;
}

export default function StreamActions({ streamId, flowRate, lastWithdrawTime }: StreamActionsProps) {
  const [withdrawing, setWithdrawing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const { addToast } = useToast();

  async function handleWithdraw() {
    setWithdrawing(true);
    try {
      const result = await sorostream.withdraw();
      addToast(`Withdrawn ${result.amount} USDC from stream #${streamId}`, "success");
    } catch {
      addToast("Withdrawal failed. Please try again.", "error");
    } finally {
      setWithdrawing(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      await sorostream.cancelStream();
      addToast(`Stream #${streamId} cancelled`, "success");
    } catch {
      addToast("Failed to cancel stream. Please try again.", "error");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
      <div className="text-center">
        <p className="text-gray-400 text-sm mb-2">Claimable now</p>
        <div className="text-3xl font-bold">
          <LiveCounter flowRate={flowRate} lastWithdrawTime={new Date(lastWithdrawTime)} />
        </div>
      </div>
      <div className="flex gap-4">
        <button
          onClick={handleWithdraw}
          disabled={withdrawing}
          className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {withdrawing ? "Withdrawing..." : "Withdraw"}
        </button>
        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="flex-1 border border-red-600 text-red-400 py-3 rounded-lg font-medium hover:bg-red-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {cancelling ? "Cancelling..." : "Cancel"}
        </button>
      </div>
    </>
  );
}
