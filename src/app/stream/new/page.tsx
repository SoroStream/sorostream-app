"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import DurationPicker from "@/components/DurationPicker";
import FlowRatePreview from "@/components/FlowRatePreview";
import StreamTemplatePicker from "@/components/StreamTemplatePicker";
import { SkeletonForm } from "@/components/Skeleton";

function validateRecipient(value: string): string {
  if (!value) return "Recipient address is required.";
  if (!/^G[A-Z2-7]{55}$/.test(value)) return "Must be a valid Stellar public key (starts with G, 56 chars).";
  return "";
}

function validateAmount(value: string): string {
  if (!value) return "Amount is required.";
  if (Number(value) <= 0) return "Amount must be greater than 0.";
  return "";
}

function validateDuration(seconds: number): string {
  if (seconds <= 0) return "Duration must be greater than 0.";
  return "";
}

export default function NewStream() {
  const t = useTranslations("stream_new");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);

  function handleTemplateSelect(seconds: number, suggestedAmount?: string) {
    setDuration(seconds);
    if (suggestedAmount) setAmount(suggestedAmount);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold mb-8">Create Stream</h1>
          <SkeletonForm />
        </div>
      </main>
    );
  }

  function handleCreateStream() {
    trackEvent({ type: 'stream_create_start' });
    // Stream creation logic would go here
    // On success: trackEvent({ type: 'stream_create_complete', streamId: '...' });
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-lg mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8">Create Stream</h1>
        <div className="space-y-6">
          <Input
            id="recipient"
            label={t("recipient_label")}
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder={t("recipient_placeholder")}
          />
          <Input
            id="amount"
            label={t("amount_label")}
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t("amount_placeholder")}
          />
          <div>
            <label htmlFor="recipient" className="text-gray-400 text-sm block mb-2">
              Recipient Address
            </label>
            <input
              id="recipient"
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              placeholder="G..."
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white"
              aria-required="true"
            />
          </div>
          <div>
            <label htmlFor="amount" className="text-gray-400 text-sm block mb-2">
              Amount (USDC)
            </label>
            <input
              id="amount"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="100"
              type="number"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white"
              aria-required="true"
            />
          </div>
          <StreamTemplatePicker onSelect={handleTemplateSelect} />
          <div>
            <label className="text-gray-400 text-sm block mb-2">Duration</label>
            <DurationPicker onChange={s => { setDuration(s); setErrors(prev => ({ ...prev, duration: "" })); }} />
            {errors.duration && <p className="text-red-400 text-sm mt-1">{errors.duration}</p>}
          </div>
          {amount && duration > 0 && <FlowRatePreview amount={amount} durationSeconds={duration} />}
          <button className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors">
            Create Stream
          </button>
        </form>
      </div>
    </main>
  );
}
