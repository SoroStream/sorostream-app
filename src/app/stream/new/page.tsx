"use client";
import { useState } from "react";
import DurationPicker from "@/components/DurationPicker";
import FlowRatePreview from "@/components/FlowRatePreview";
import StreamTemplatePicker from "@/components/StreamTemplatePicker";
import { SkeletonForm } from "@/components/Skeleton";

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
            <DurationPicker onChange={setDuration} />
          </div>
          {amount && duration > 0 && <FlowRatePreview amount={amount} durationSeconds={duration} />}
          <button className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors">
            Create Stream
          </button>
        </div>
      </div>
    </main>
  );
}
