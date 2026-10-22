"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import FeeEstimationPanel from "@/components/FeeEstimationPanel";
import { getFeeConfig } from "@/src/lib/sorostream";

/**
 * In-app documentation page (#431) explaining the SoroStream fee structure:
 * the protocol fee, the Soroban transaction fee, and how both affect
 * effective stream rates.
 */
export default function FeesDocsPage() {
  const [feeBasisPoints, setFeeBasisPoints] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    getFeeConfig()
      .then(({ basisPoints }) => {
        if (active) setFeeBasisPoints(basisPoints);
      })
      .catch(() => {
        if (active) setFeeBasisPoints(0);
      });
    return () => {
      active = false;
    };
  }, []);

  const feePercent = feeBasisPoints === null ? null : feeBasisPoints / 100;

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-4">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">
            ← Back to Dashboard
          </Link>
        </div>

        <h1 className="text-2xl font-bold mb-2">Stream Fee Structure</h1>
        <p className="text-gray-400 text-sm mb-8">
          How SoroStream fees work, what you pay, and how they affect your stream rates.
        </p>

        {/* ── Protocol fee ── */}
        <section aria-labelledby="protocol-fee-heading" className="bg-gray-800 rounded-xl p-6 space-y-3 mb-6 border border-gray-700">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="protocol-fee-heading" className="text-lg font-semibold">Protocol Fee</h2>
            <span className="font-mono text-yellow-400 text-lg" data-testid="docs-fee-percent">
              {feePercent === null ? "…" : `${feePercent}%`}
            </span>
          </div>
          <p className="text-gray-300 text-sm">
            The protocol fee is a percentage taken from stream withdrawals by the SoroStream
            contract. It is deducted from the <span className="text-white font-medium">recipient&apos;s</span> vested
            balance — senders never pay extra.
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-gray-400 text-sm pl-1">
            <li>Charged in the same token as the stream.</li>
            <li>Applied at withdrawal time on the amount being withdrawn, not upfront at creation.</li>
            <li>Accrues to the on-chain treasury and is distributed per governance policy.</li>
          </ul>
          <div className="bg-gray-900/60 rounded-lg p-3 text-xs text-gray-400 space-y-1">
            <p className="text-gray-300 font-medium mb-1">Worked example</p>
            <p>A recipient withdraws 100 USDC from an active stream:</p>
            <p className="font-mono">
              Fee ({feePercent ?? 0.5}%) = {(feeBasisPoints ?? 50) === 50 ? "0.5" : ((feeBasisPoints ?? 0) / 100)} USDC
              {" · "}Recipient receives = {(feeBasisPoints ?? 50) === 50 ? "99.5" : (100 - (feeBasisPoints ?? 0) / 100)} USDC
            </p>
          </div>
        </section>

        {/* ── Soroban transaction fee ── */}
        <section aria-labelledby="tx-fee-heading" className="bg-gray-800 rounded-xl p-6 space-y-3 mb-6 border border-gray-700">
          <h2 id="tx-fee-heading" className="text-lg font-semibold">Soroban Transaction Fee</h2>
          <p className="text-gray-300 text-sm">
            Every on-chain operation (creating, withdrawing from, or cancelling a stream) is a
            Soroban transaction that pays a network fee denominated in{" "}
            <span className="text-white font-medium">XLM</span>. Unlike the protocol fee, this is
            paid by the <span className="text-white font-medium">sender of the transaction</span>.
          </p>
          <div className="space-y-2 text-sm">
            <div className="bg-gray-900/60 rounded-lg p-3">
              <p className="font-medium text-gray-200">Inclusion fee</p>
              <p className="text-gray-400 text-xs mt-0.5">
                A small flat fee to include the transaction in a ledger. Set as the transaction&apos;s
                base fee.
              </p>
            </div>
            <div className="bg-gray-900/60 rounded-lg p-3">
              <p className="font-medium text-gray-200">Resource fee</p>
              <p className="text-gray-400 text-xs mt-0.5">
                Covers CPU, memory, and ledger footprint consumed by contract execution. Scales
                with the complexity of the call — e.g. larger metadata payloads cost more.
              </p>
            </div>
          </div>
          <FeeEstimationPanel active />
          <p className="text-xs text-gray-500">
            Tip: if a fee sponsor is configured, the sponsor account pays the transaction fee for you.
          </p>
        </section>

        {/* ── Effect on rates ── */}
        <section aria-labelledby="rates-heading" className="bg-gray-800 rounded-xl p-6 space-y-3 mb-6 border border-gray-700">
          <h2 id="rates-heading" className="text-lg font-semibold">How Fees Affect Stream Rates</h2>
          <p className="text-gray-300 text-sm">
            A stream&apos;s advertised flow rate (e.g. tokens/day) is always{" "}
            <span className="text-white font-medium">gross</span> — calculated from the full
            deposit divided by duration. What a recipient actually keeps depends on when they withdraw:
          </p>
          <ol className="list-decimal list-inside space-y-1.5 text-gray-400 text-sm pl-1">
            <li>Vesting accrues gross tokens continuously over the stream duration.</li>
            <li>The protocol fee is applied only to amounts actually withdrawn.</li>
            <li>The XLM transaction fee applies once per withdrawal transaction, regardless of size — so fewer, larger withdrawals are cheaper.</li>
          </ol>
          <p className="text-gray-400 text-sm">
            Effective net rate ≈{" "}
            <span className="font-mono text-green-400">gross rate × (1 − protocol fee)</span>,
            minus the amortised cost of withdrawal transactions.
          </p>
        </section>

        <section aria-labelledby="faq-heading" className="bg-gray-800 rounded-xl p-6 space-y-3 border border-gray-700">
          <h2 id="faq-heading" className="text-lg font-semibold">FAQ</h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-medium text-gray-200">Do I pay the protocol fee when creating a stream?</dt>
              <dd className="text-gray-400 mt-0.5">No. It is only charged when the recipient withdraws vested funds.</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-200">Can the protocol fee change?</dt>
              <dd className="text-gray-400 mt-0.5">
                Yes — it is set by contract config and may change through governance. Your existing
                streams are affected only for withdrawals made after a change.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-200">Who pays when cancelling a stream?</dt>
              <dd className="text-gray-400 mt-0.5">
                Only the Soroban transaction fee (XLM) for the cancel transaction. No protocol fee applies to returning unvested funds.
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </main>
  );
}
