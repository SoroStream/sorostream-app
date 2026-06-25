"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import DurationPicker from "@/components/DurationPicker";
import FlowRatePreview from "@/components/FlowRatePreview";
import { sorostream } from "@/src/lib/sorostream";
import { connectWallet } from "@/src/lib/freighter";

export default function NewStream() {
  const router = useRouter();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!recipient || !amount || duration <= 0) {
      setError('Please fill in all fields.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const wallet = await connectWallet();
      if (!wallet) throw new Error('Wallet not connected. Please install Freighter.');
      const result = await sorostream.createStream({ recipient, amount, duration, sender: wallet });
      router.push(`/stream/${result.streamId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transaction failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-8">Create Stream</h1>
        <div className="space-y-6">
          <div>
            <label className="text-gray-400 text-sm block mb-2">Recipient Address</label>
            <input value={recipient} onChange={e => setRecipient(e.target.value)}
              placeholder="G..." className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white" />
          </div>
          <div>
            <label className="text-gray-400 text-sm block mb-2">Amount (USDC)</label>
            <input value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="100" type="number" className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white" />
          </div>
          <div>
            <label className="text-gray-400 text-sm block mb-2">Duration</label>
            <DurationPicker onChange={setDuration} />
          </div>
          {amount && duration > 0 && <FlowRatePreview amount={amount} durationSeconds={duration} />}
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Create Stream'}
          </button>
        </div>
      </div>
    </main>
  );
}
