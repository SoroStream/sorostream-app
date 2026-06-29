"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DurationPicker from "@/components/DurationPicker";
import FlowRatePreview from "@/components/FlowRatePreview";
import StreamTemplatePicker from "@/components/StreamTemplatePicker";
import RecipientAutocomplete from "@/components/RecipientAutocomplete";
import { SkeletonForm } from "@/components/Skeleton";
import { useTranslations } from "@/src/lib/i18n";
import { trackEvent } from "@/src/lib/analytics";
import { sorostream } from "@/src/lib/sorostream";

type Step = "recipient" | "amount" | "review";

const SUPPORTED_TOKENS = [
  { symbol: "USDC", name: "USD Coin",        address: "CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU" },
  { symbol: "XLM",  name: "Stellar Lumens",  address: "native" },
  { symbol: "AQUA", name: "Aquarius",        address: "GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA" },
  { symbol: "yXLM", name: "Yield XLM",       address: "GARDNV3Q7YGT4AKSDF25LT32YSCCW4EV22Y2TV3I2PU2MMXJTEDL5T55" },
] as const;

const CUSTOM_TOKEN_VALUE = "__custom__";

function validateRecipient(value: string): string {
  if (!value) return "Recipient address is required.";
  if (!/^G[A-Z2-7]{55}$/.test(value))
    return "Must be a valid Stellar public key (starts with G, 56 chars).";
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

const stepLabels: Record<Step, { title: string; number: number }> = {
  recipient: { title: "Recipient", number: 1 },
  amount: { title: "Amount & Duration", number: 2 },
  review: { title: "Review & Confirm", number: 3 },
};

const STEPS: Step[] = ["recipient", "amount", "review"];

function NewStreamWizard() {
  const router = useRouter();
  const t = useTranslations("stream_new");
  const [step, setStep] = useState<Step>("recipient");
  const searchParams = useSearchParams();

  const recipientParam = searchParams.get("recipient");
  const amountParam = searchParams.get("amount");
  const durationParam = searchParams.get("duration");

  const initialRecipient =
    recipientParam && /^G[A-Z2-7]{55}$/.test(recipientParam)
      ? recipientParam
      : "";
  const initialAmount = (() => {
    if (!amountParam) return "";
    const num = parseFloat(amountParam);
    return !isNaN(num) && num > 0 ? amountParam : "";
  })();
  const initialDuration = (() => {
    if (!durationParam) return 0;
    const num = parseInt(durationParam, 10);
    return !isNaN(num) && num > 0 ? num : 0;
  })();

  const [recipient, setRecipient] = useState(initialRecipient);
  const [amount, setAmount] = useState(initialAmount);
  const [duration, setDuration] = useState(initialDuration);
  const [selectedToken, setSelectedToken] = useState<string>(SUPPORTED_TOKENS[0].symbol);
  const [customTokenAddress, setCustomTokenAddress] = useState("");
  const [customTokenError, setCustomTokenError] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ recipient: "", amount: "", duration: "" });
  const [touched, setTouched] = useState({ recipient: false, amount: false });
  const [durationPickerKey, setDurationPickerKey] = useState(0);

  function handleTemplateSelect(seconds: number, suggestedAmount?: string, recipientOverride?: string) {
    setDuration(seconds);
    setErrors((prev) => ({ ...prev, duration: "" }));
    if (suggestedAmount) {
      setAmount(suggestedAmount);
      setErrors((prev) => ({ ...prev, amount: "" }));
    }
    if (recipientOverride && /^G[A-Z2-7]{55}$/.test(recipientOverride)) {
      setRecipient(recipientOverride);
      setErrors((prev) => ({ ...prev, recipient: "" }));
    }
  }

  function handleRecipientBlur() {
    setTouched((prev) => ({ ...prev, recipient: true }));
    setErrors((prev) => ({ ...prev, recipient: validateRecipient(recipient) }));
  }

  function handleAmountBlur() {
    setTouched((prev) => ({ ...prev, amount: true }));
    setErrors((prev) => ({ ...prev, amount: validateAmount(amount) }));
  }

  function goNext() {
    if (step === "recipient") {
      const err = validateRecipient(recipient);
      if (err) {
        setErrors((prev) => ({ ...prev, recipient: err }));
        setTouched((prev) => ({ ...prev, recipient: true }));
        return;
      }
      setStep("amount");
    } else if (step === "amount") {
      const aErr = validateAmount(amount);
      const dErr = validateDuration(duration);
      if (aErr || dErr) {
        setErrors({ ...errors, amount: aErr, duration: dErr });
        return;
      }
      setStep("review");
    }
  }

  function goBack() {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  }

  function resolvedTokenAddress(): string | null {
    if (selectedToken === CUSTOM_TOKEN_VALUE) {
      const trimmed = customTokenAddress.trim();
      if (!trimmed) { setCustomTokenError("Contract address is required."); return null; }
      setCustomTokenError("");
      return trimmed;
    }
    return SUPPORTED_TOKENS.find((t) => t.symbol === selectedToken)?.address ?? SUPPORTED_TOKENS[0].address;
  }

  async function handleCreateStream() {
    const rErr = validateRecipient(recipient);
    const aErr = validateAmount(amount);
    const dErr = validateDuration(duration);
    if (rErr || aErr || dErr) {
      setErrors({ recipient: rErr, amount: aErr, duration: dErr });
      return;
    }

    const tokenAddress = resolvedTokenAddress();
    if (!tokenAddress) return;

    setLoading(true);
    trackEvent({ type: "stream_create_start" });
    try {
      const result = await sorostream.createStream({
        recipient,
        amount,
        durationSeconds: duration,
        token: selectedToken === CUSTOM_TOKEN_VALUE ? tokenAddress : selectedToken,
      });
      trackEvent({ type: "stream_create_complete", streamId: result.streamId });
      setRecipient("");
      setAmount("");
      setDuration(0);
      setErrors({ recipient: "", amount: "", duration: "" });
      setTouched({ recipient: false, amount: false });
      setDurationPickerKey((k) => k + 1);
      router.push(`/stream/${result.streamId}?new=true`);
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

  const canGoNext = step === "recipient"
    ? recipient.length > 0
    : step === "amount"
    ? amount.length > 0 && duration > 0
    : true;

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-lg mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold transition-colors ${
                    step === s
                      ? "bg-green-600 text-white"
                      : STEPS.indexOf(step) > i
                      ? "bg-green-800 text-green-300"
                      : "bg-gray-700 text-gray-400"
                  }`}
                >
                  {STEPS.indexOf(step) > i ? "✓" : i + 1}
                </div>
                <span className={`text-xs hidden sm:inline ${step === s ? "text-white" : "text-gray-500"}`}>
                  {stepLabels[s].title}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={`w-8 h-px ${STEPS.indexOf(step) > i ? "bg-green-600" : "bg-gray-700"}`} />
                )}
              </div>
            ))}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-center">{stepLabels[step].title}</h1>
        </div>

        {/* Step: Recipient */}
        {step === "recipient" && (
          <div className="space-y-6">
            <div>
              <label htmlFor="recipient" className="text-gray-200 text-sm font-medium block mb-2">
                {t("recipient_label")}
              </label>
              <RecipientAutocomplete
                value={recipient}
                onChange={(v) => {
                  setRecipient(v);
                  setErrors((prev) => ({ ...prev, recipient: "" }));
                }}
                onBlur={handleRecipientBlur}
                placeholder={t("recipient_placeholder")}
                error={errors.recipient}
                touched={touched.recipient}
              />
              {errors.recipient && (
                <p id="recipient-error" className="text-red-400 text-sm mt-1">
                  {errors.recipient}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step: Amount & Duration */}
        {step === "amount" && (
          <div className="space-y-6">
            {/* Token selector */}
            <div>
              <label htmlFor="token-select" className="text-gray-200 text-sm font-medium block mb-2">
                Token
              </label>
              <select
                id="token-select"
                value={selectedToken}
                onChange={(e) => {
                  setSelectedToken(e.target.value);
                  setCustomTokenError("");
                }}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              >
                {SUPPORTED_TOKENS.map((t) => (
                  <option key={t.symbol} value={t.symbol}>
                    {t.symbol} — {t.name} ({t.address === "native" ? "native" : `${t.address.slice(0, 6)}…${t.address.slice(-4)}`})
                  </option>
                ))}
                <option value={CUSTOM_TOKEN_VALUE}>Custom token…</option>
              </select>
              {selectedToken === CUSTOM_TOKEN_VALUE && (
                <div className="mt-2">
                  <input
                    id="custom-token-address"
                    type="text"
                    value={customTokenAddress}
                    onChange={(e) => { setCustomTokenAddress(e.target.value); setCustomTokenError(""); }}
                    placeholder="Contract address (e.g. C…)"
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                    aria-label="Custom token contract address"
                    aria-invalid={!!customTokenError}
                    aria-describedby={customTokenError ? "custom-token-error" : undefined}
                  />
                  {customTokenError && (
                    <p id="custom-token-error" className="text-red-400 text-xs mt-1">{customTokenError}</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="amount" className="text-gray-200 text-sm font-medium block mb-2">
                {t("amount_label")}
              </label>
              <input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setErrors((prev) => ({ ...prev, amount: "" }));
                }}
                onBlur={handleAmountBlur}
                placeholder={t("amount_placeholder")}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                aria-required="true"
                aria-invalid={!!(touched.amount && errors.amount)}
                aria-describedby={
                  touched.amount && errors.amount ? "amount-error" : undefined
                }
              />
              {errors.amount && (
                <p id="amount-error" className="text-red-400 text-sm mt-1">
                  {errors.amount}
                </p>
              )}
            </div>

            <StreamTemplatePicker
              onSelect={handleTemplateSelect}
              currentRecipient={recipient}
              currentAmount={amount}
              currentDuration={duration}
            />

            <div>
              <label className="text-gray-200 text-sm font-medium block mb-2">{t("duration_label")}</label>
              <DurationPicker
                key={durationPickerKey}
                initialSeconds={duration > 0 ? duration : undefined}
                onChange={(s) => {
                  setDuration(s);
                  if (s > 0) setErrors((prev) => ({ ...prev, duration: "" }));
                }}
                error={errors.duration || undefined}
              />
            </div>

            {amount && duration > 0 && (
              <FlowRatePreview amount={amount} durationSeconds={duration} />
            )}
          </div>
        )}

        {/* Step: Review & Confirm */}
        {step === "review" && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl p-5 space-y-4 border border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Recipient</span>
                <span className="text-white font-mono text-sm">{recipient}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Token</span>
                <span className="text-white font-mono text-sm">
                  {selectedToken === CUSTOM_TOKEN_VALUE
                    ? `Custom (${customTokenAddress.slice(0, 8)}…)`
                    : selectedToken}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Amount</span>
                <span className="text-white font-mono text-sm">
                  {amount} {selectedToken === CUSTOM_TOKEN_VALUE ? "tokens" : selectedToken}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Duration</span>
                <span className="text-white font-mono text-sm">
                  {duration >= 86400
                    ? `${Math.floor(duration / 86400)}d ${Math.floor((duration % 86400) / 3600)}h`
                    : duration >= 3600
                    ? `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`
                    : `${Math.floor(duration / 60)}m`}
                </span>
              </div>
              <div className="border-t border-gray-700 pt-4">
                <FlowRatePreview amount={amount} durationSeconds={duration} />
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-4 mt-8">
          {step !== "recipient" && (
            <button
              type="button"
              onClick={goBack}
              disabled={loading}
              className="flex-1 border border-gray-600 text-gray-300 py-3 rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              Back
            </button>
          )}
          {step !== "review" ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canGoNext}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreateStream}
              disabled={loading}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {t("submit")}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

export default function NewStreamPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-gray-900 text-white p-4 sm:p-8"><div className="max-w-lg mx-auto"><SkeletonForm /></div></main>}>
      <NewStreamWizard />
    </Suspense>
  );
}
