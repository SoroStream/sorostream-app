"use client";

import FiatDisplay from "@/components/FiatDisplay";

interface StreamCardProps {
  id?: string;
  sender?: string;
  recipient?: string;
  flowRate?: number;
  status?: string;
  deposit?: number;
}

export default function StreamCard({ id = '', sender = '', recipient = '', flowRate = 0, status = 'Active', deposit = 0 }: StreamCardProps) {
  const truncate = (addr: string) => addr ? `${addr.slice(0, 4)}...${addr.slice(-4)}` : '';
  const fmt = (val: number) => (val / 10000000).toFixed(2);
  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-2 border border-gray-700" role="article" aria-label={`Stream ${id}`}>
      <div className="flex justify-between items-center">
        <span className="text-gray-400 text-xs">Stream #{id}</span>
        <span
          className={`text-xs px-2 py-1 rounded-full ${status === 'Active' ? 'bg-green-900 text-green-400' : 'bg-gray-700 text-gray-400'}`}
          aria-label={`Status: ${status}`}
        >
          {status}
        </span>
      </div>
      <div className="text-sm">
        <p className="text-gray-400">From: <span className="text-white">{truncate(sender)}</span></p>
        <p className="text-gray-400">To: <span className="text-white">{truncate(recipient)}</span></p>
        <p className="text-gray-400">Flow: <span className="text-green-400">{fmt(flowRate)} USDC/sec <FiatDisplay usdcAmount={flowRate / 10000000} /></span></p>
        <p className="text-gray-400">Total: <span className="text-white">{fmt(deposit)} USDC <FiatDisplay usdcAmount={deposit / 10000000} /></span></p>
      </div>
    </div>
  );
}
