"use client";

import { useEffect, useState } from "react";
import { simulateStreamDryRun, type StreamDryRunResult } from "@/src/lib/streamDryRun";

type DryRunState =
  | { status: "loading" }
  | { status: "done"; result: StreamDryRunResult };

interface StreamDryRunPreviewProps {
  /** Total amount in user-facing units (e.g. "100" USDC). */
  amount: string;
  durationSeconds: number;
  cliffSeconds?: number;
  /** Protocol fee basis points (0 when unknown). */
  feeBasisPoints?: number;
  token?: string;
  /** Set to true to (re)run the simulation, e.g. when the step becomes visible. */
  active?: boolean;
}

const STROOPS = 10_000_000;

function fmtTokens(stroops: number): string {
  return (stroops / STROOPS).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 7,
  });
}

function fmtProgress(progress: number): string {
  if (progress === 0) return "Start";
  if (progress === 1) return "End";
  return `${Math.round(progress * 100)}%`;
}

/**
 * Pre-sign dry-run preview (#430).
 * Simulates the proposed stream over its lifetime — cumulative vested
 * amounts, protocol-fee impact and net receivable at each checkpoint —
 * without submitting any transaction.
 */
export default function StreamDryRunPreview({
  amount,
  durationSeconds,
  cliffSeconds,
  feeBasisPoints = 0,
  token = "tokens",
  active = true,
}: StreamDryRunPreviewProps) {
  const [state, setState] = useState<DryRunState>({ status: "loading" });

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    setState({ status: "loading" });

    // Simulate an RPC dry-run round-trip before showing results.
    const timer = setTimeout(() => {
      if (cancelled) return;
      try {
        const result = simulateStreamDryRun({
          amountStroops: Math.round((parseFloat(amount) || 0) * STROOPS),
          durationSeconds,
          cliffSeconds,
          feeBasisPoints,
        });
        setState({ status: "done", result });
      } catch {
        setState({
          status: "done",
          result: {
            ok: false,
            error: "Simulation failed unexpectedly.",
            checkpoints: [],
            totalFeeStroops: 0,
            netTotalStroops: 0,
          },
        });
      }
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [active, amount, durationSeconds, cliffSeconds, feeBasisPoints]);

  if (!active) return null;

  return (
    <section
      aria-labelledby="dry-run-heading"
      aria-busy={state.status === "loading"}
      className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4"
      data-testid="stream-dry-run"
    >
      <div className="flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-blue-400 shrink-0"
          aria-hidden="true"
        >
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        <h2 id="dry-run-heading" className="text-sm font-semibold uppercase tracking-wide text-gray-300">
          Dry-Run Simulation
        </h2>
        <span className="ml-auto text-xs text-gray-500">no transaction will be signed</span>
      </div>

      {state.status === "loading" && (
        <div className="space-y-2 animate-pulse" role="status" aria-label="Running dry-run simulation">
          {[68, 52, 60].map((w, i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="h-3 bg-gray-700 rounded" style={{ width: `${w}px` }} />
              <div className="h-3 bg-gray-700 rounded w-24" />
            </div>
          ))}
          <p className="text-xs text-gray-500 text-center pt-1">Simulating stream over time…</p>
        </div>
      )}

      {state.status === "done" && !state.result.ok && (
        <div role="alert" className="bg-red-900/20 border border-red-700/40 rounded-lg p-3 text-sm text-red-300">
          <p className="font-semibold mb-1">Dry run failed</p>
          <p className="text-xs">{state.result.error}</p>
        </div>
      )}

      {state.status === "done" && state.result.ok && (
        <>
          <div
            role="status"
            className="bg-green-900/20 border border-green-700/40 rounded-lg px-3 py-2 flex items-center gap-2 text-green-300 text-sm"
          >
            <span aria-hidden="true">✓</span>
            Simulation passed — this stream would be created successfully.
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Simulated stream checkpoints">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-700">
                  <th scope="col" className="py-2 pr-2 font-medium">Point</th>
                  <th scope="col" className="py-2 pr-2 font-medium">Date</th>
                  <th scope="col" className="py-2 pr-2 font-medium text-right">Vested</th>
                  <th scope="col" className="py-2 pr-2 font-medium text-right">Fee</th>
                  <th scope="col" className="py-2 font-medium text-right">Net</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {state.result.checkpoints.map((cp) => (
                  <tr key={cp.progress} className="border-b border-gray-800 last:border-0">
                    <td className="py-2 pr-2 text-gray-400 font-sans">{fmtProgress(cp.progress)}</td>
                    <td className="py-2 pr-2 text-gray-400">
                      {new Date(cp.time * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="py-2 pr-2 text-white text-right">{fmtTokens(cp.vestedStroops)}</td>
                    <td className="py-2 pr-2 text-yellow-400 text-right">{fmtTokens(cp.feeStroops)}</td>
                    <td className="py-2 text-green-400 text-right">{fmtTokens(cp.netStroops)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-700 pt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500 text-xs">Total protocol fee</p>
              <p className="font-mono text-yellow-400" data-testid="dry-run-total-fee">
                {fmtTokens(state.result.totalFeeStroops)} {token}
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-500 text-xs">Net to recipient</p>
              <p className="font-mono text-green-400" data-testid="dry-run-net-total">
                {fmtTokens(state.result.netTotalStroops)} {token}
              </p>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Values are simulated locally from your stream parameters. Actual on-chain amounts may vary slightly.
          </p>
        </>
      )}
    </section>
  );
}
