"use client";
import { useState } from "react";
import Link from "next/link";
import DurationPicker from "@/components/DurationPicker";
import FlowRatePreview from "@/components/FlowRatePreview";
import StreamTemplatePicker from "@/components/StreamTemplatePicker";
import { SkeletonForm } from "@/components/Skeleton";

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
  const [step, setStep] = useState<Step>("template");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ recipient: "", amount: "", duration: "" });

  function handleTemplateSelect(seconds: number, suggestedAmount?: string) {
    setDuration(seconds);
    if (suggestedAmount) setAmount(suggestedAmount);
    setStep("details");
  }

  function nextStep() {
    const nextErrors = {
      recipient: validateRecipient(recipient),
      amount: validateAmount(amount),
      duration: validateDuration(duration),
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some((e) => e)) return;
    setStep((prev) => {
      const idx = STEPS.findIndex((s) => s.key === prev);
      return STEPS[Math.min(idx + 1, STEPS.length - 1)].key;
    });
  }

  function prevStep() {
    setStep((prev) => {
      const idx = STEPS.findIndex((s) => s.key === prev);
      return STEPS[Math.max(idx - 1, 0)].key;
    });
  }

  function handleCreateStream() {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      alert("Stream creation mock successful.");
    }, 1500);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold mb-8">Creating Stream…</h1>
          <SkeletonForm />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-lg mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8">Create Stream</h1>

        <nav className="flex items-center gap-2 mb-8" aria-label="Wizard progress">
          {STEPS.map((s, idx) => {
            const currentIdx = STEPS.findIndex((st) => st.key === step);
            const isActive = s.key === step;
            const isComplete = idx < currentIdx;
            return (
              <div key={s.key} className="flex items-center gap-2 flex-1">
                <div
                  className={
                    "h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold " +
                    (isActive
                      ? "bg-green-600 text-white"
                      : isComplete
                        ? "bg-green-900 text-green-200"
                        : "bg-gray-700 text-gray-400")
                  }
                >
                  {isComplete ? "✓" : idx + 1}
                </div>
                <span className={"text-sm " + (isActive ? "text-white" : "text-gray-500")}>{s.label}</span>
                {idx < STEPS.length - 1 && <div className="flex-1 h-px bg-gray-700 mx-2" />}
              </div>
            );
          })}
        </nav>

        {step === "template" && (
          <div className="space-y-6">
            <p className="text-gray-400 text-sm">Select a template to get started.</p>
            <StreamTemplatePicker onSelect={handleTemplateSelect} />
            <div className="flex justify-end">
              <button
                onClick={nextStep}
                className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-600 transition-colors"
              >
                Skip template
              </button>
            </div>
          </div>
        )}

        {step === "details" && (
          <div className="space-y-6">
            <div>
              <label htmlFor="recipient" className="text-gray-400 text-sm block mb-2">
                Recipient Address
              </label>
              <input
                id="recipient"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="G..."
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white"
                aria-required="true"
              />
              {errors.recipient && <p className="text-red-400 text-sm mt-1">{errors.recipient}</p>}
            </div>
            <div>
              <label htmlFor="amount" className="text-gray-400 text-sm block mb-2">
                Amount (USDC)
              </label>
              <input
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100"
                type="number"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white"
              />
              {errors.amount && <p className="text-red-400 text-sm mt-1">{errors.amount}</p>}
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-2">Duration</label>
              <DurationPicker
                onChange={(s) => {
                  setDuration(s);
                  setErrors((prev) => ({ ...prev, duration: "" }));
                }}
              />
              {errors.duration && <p className="text-red-400 text-sm mt-1">{errors.duration}</p>}
            </div>
            <div className="flex justify-between">
              <button
                onClick={prevStep}
                className="border border-gray-500 text-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
              >
                Back
              </button>
              <button
                onClick={nextStep}
                className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-600 transition-colors"
              >
                Review
              </button>
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl p-6 space-y-4 border border-gray-700">
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wider">Recipient</p>
                <p className="text-white font-mono break-all">{recipient}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wider">Amount</p>
                <p className="text-white font-semibold">{amount} USDC</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wider">Duration</p>
                <p className="text-white font-semibold">{Math.floor(duration / 86_400)}d {Math.floor((duration % 86_400) / 3600)}h {Math.floor((duration % 3600) / 60)}m</p>
              </div>
              {amount && duration > 0 && <FlowRatePreview amount={amount} durationSeconds={duration} />}
            </div>
            <div className="flex justify-between">
              <button
                onClick={prevStep}
                className="border border-gray-500 text-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
              >
                Back
              </button>
              <button
                onClick={nextStep}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl p-6 space-y-4 border border-gray-700">
              <h2 className="text-lg font-semibold">Confirm Stream</h2>
              <p className="text-gray-400 text-sm">
                You are about to create a stream with the parameters above.
              </p>
            </div>
            <div className="flex justify-between">
              <button
                onClick={prevStep}
                className="border border-gray-500 text-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleCreateStream}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                Create Stream
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
