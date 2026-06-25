"use client";
import { useState, useEffect } from "react";
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
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ recipient: "", amount: "", duration: "" });
  const [touched, setTouched] = useState({ recipient: false, amount: false, duration: false });

  function validateAll() {
    setTouched({ recipient: true, amount: true, duration: true });
    setErrors({
      recipient: validateRecipient(recipient),
      amount: validateAmount(amount),
      duration: validateDuration(duration),
    });
  }

  function handleTemplateSelect(seconds: number, suggestedAmount?: string) {
    setDuration(seconds);
    if (suggestedAmount) setAmount(suggestedAmount);
  }

  function handleRecipientBlur() {
    setTouched((prev) => ({ ...prev, recipient: true }));
    setErrors((prev) => ({ ...prev, recipient: validateRecipient(recipient) }));
  }

  function handleAmountBlur() {
    setTouched((prev) => ({ ...prev, amount: true }));
    setErrors((prev) => ({ ...prev, amount: validateAmount(amount) }));
  }

  function handleCreateStream() {
    validateAll();
    const hasError = validateRecipient(recipient) || validateAmount(amount) || validateDuration(duration);
    if (hasError) return;
    setLoading(true);
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
          <div>
            <label htmlFor="recipient" className="text-gray-400 text-sm block mb-2">
              Recipient Address
            </label>
            <input
              id="recipient"
              value={recipient}
              onChange={(e) => {
                setRecipient(e.target.value);
                if (touched.recipient) {
                  setErrors((prev) => ({ ...prev, recipient: validateRecipient(e.target.value) }));
                }
              }}
              onBlur={handleRecipientBlur}
              placeholder="G..."
              className={`w-full bg-gray-800 border rounded-lg px-4 py-3 text-white ${
                touched.recipient && errors.recipient ? "border-red-500" : "border-gray-600"
              }`}
              aria-required="true"
              aria-invalid={!!(touched.recipient && errors.recipient)}
              aria-describedby={touched.recipient && errors.recipient ? "recipient-error" : undefined}
            />
            {touched.recipient && errors.recipient && (
              <p id="recipient-error" className="text-red-400 text-sm mt-1" role="alert">
                {errors.recipient}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="amount" className="text-gray-400 text-sm block mb-2">
              Amount (USDC)
            </label>
            <input
              id="amount"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (touched.amount) {
                  setErrors((prev) => ({ ...prev, amount: validateAmount(e.target.value) }));
                }
              }}
              onBlur={handleAmountBlur}
              placeholder="100"
              type="number"
              className={`w-full bg-gray-800 border rounded-lg px-4 py-3 text-white ${
                touched.amount && errors.amount ? "border-red-500" : "border-gray-600"
              }`}
              aria-required="true"
              aria-invalid={!!(touched.amount && errors.amount)}
              aria-describedby={touched.amount && errors.amount ? "amount-error" : undefined}
            />
            {touched.amount && errors.amount && (
              <p id="amount-error" className="text-red-400 text-sm mt-1" role="alert">
                {errors.amount}
              </p>
            )}
          </div>
          <div>
            <label className="text-gray-400 text-sm block mb-2">Duration</label>
            <DurationPicker
              onChange={(s) => {
                setDuration(s);
                setErrors((prev) => ({ ...prev, duration: "" }));
              }}
            />
            {touched.duration && errors.duration && (
              <p className="text-red-400 text-sm mt-1" role="alert">{errors.duration}</p>
            )}
          </div>
          <StreamTemplatePicker onSelect={handleTemplateSelect} />
          {amount && duration > 0 && <FlowRatePreview amount={amount} durationSeconds={duration} />}
          <button
            onClick={handleCreateStream}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Create Stream
          </button>
        </div>
      </div>
    </main>
  );
}
