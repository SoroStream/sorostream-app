"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import DurationPicker from "@/components/DurationPicker";
import FlowRatePreview from "@/components/FlowRatePreview";
import StreamTemplatePicker from "@/components/StreamTemplatePicker";
import { SkeletonForm } from "@/components/Skeleton";
import { Input } from "@/components/ui";
import { useTranslations } from "@/src/lib/i18n";
import { trackEvent } from "@/src/lib/analytics";

type Step = "template" | "details" | "review" | "confirm";

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

const STEPS: { key: Step; label: string }[] = [
  { key: "template", label: "Template" },
  { key: "details", label: "Details" },
  { key: "review", label: "Review" },
  { key: "confirm", label: "Confirm" },
];

export default function NewStream() {
  const router = useRouter();
  const t = useTranslations("stream_new");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ recipient: "", amount: "", duration: "" });

  function handleTemplateSelect(seconds: number, suggestedAmount?: string) {
    setDuration(seconds);
    setErrors(prev => ({ ...prev, duration: "" }));
    if (suggestedAmount) {
      setAmount(suggestedAmount);
      setErrors(prev => ({ ...prev, amount: "" }));
    }
  }

  async function handleCreateStream(e: React.FormEvent) {
    e.preventDefault();
    const rErr = validateRecipient(recipient);
    const aErr = validateAmount(amount);
    const dErr = validateDuration(duration);

    if (rErr || aErr || dErr) {
      setErrors({ recipient: rErr, amount: aErr, duration: dErr });
      return;
    }

    setLoading(true);
    trackEvent({ type: 'stream_create_start' });
    try {
      const result = await sorostream.createStream();
      trackEvent({ type: 'stream_create_complete', streamId: result.streamId });
      router.push(`/stream/${result.streamId}`);
    } catch (err) {
      console.error("Failed to create stream:", err);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold mb-8">{t("title")}</h1>
          <SkeletonForm />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-lg mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8">{t("title")}</h1>
        <form onSubmit={handleCreateStream} className="space-y-6">
          <div>
            <label htmlFor="recipient" className="text-gray-400 text-sm block mb-2">
              {t("recipient_label")}
            </label>
            <input
              id="recipient"
              label={t("recipient_label")}
              value={recipient}
              onChange={e => {
                setRecipient(e.target.value);
                setErrors(prev => ({ ...prev, recipient: "" }));
              }}
              placeholder={t("recipient_placeholder")}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white font-mono"
              aria-required="true"
            />
            {errors.recipient && <p className="text-red-400 text-sm mt-1">{errors.recipient}</p>}
          </div>

          <div>
            <label htmlFor="amount" className="text-gray-400 text-sm block mb-2">
              {t("amount_label")}
            </label>
            <input
              id="amount"
              value={amount}
              onChange={e => {
                setAmount(e.target.value);
                setErrors(prev => ({ ...prev, amount: "" }));
              }}
              placeholder={t("amount_placeholder")}
              type="number"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setErrors(prev => ({ ...prev, amount: "" }));
              }}
              placeholder={t("amount_placeholder")}
            />
            {errors.amount && <p className="text-red-400 text-sm mt-1">{errors.amount}</p>}
          </div>

          <StreamTemplatePicker onSelect={handleTemplateSelect} />

          <div>
            <label className="text-gray-400 text-sm block mb-2">{t("duration_label")}</label>
            <DurationPicker onChange={s => { setDuration(s); setErrors(prev => ({ ...prev, duration: "" })); }} />
            {errors.duration && <p className="text-red-400 text-sm mt-1">{errors.duration}</p>}
          </div>

          {amount && duration > 0 && <FlowRatePreview amount={amount} durationSeconds={duration} />}

          <button
            type="submit"
            className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            {t("submit")}
          </button>
        </form>
      </div>
    </main>
  );
}
