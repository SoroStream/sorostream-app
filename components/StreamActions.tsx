"use client";

/**
 * StreamActions — Consolidated stream action button set.
 *
 * ============================================================
 * ACTION BUTTON ORGANISATION — CURRENT STATE (feat/780)
 * ============================================================
 *
 * Before this component existed, stream action buttons were scattered across
 * two surfaces with no shared abstraction:
 *
 * 1. src/app/stream/[id]/page.tsx (Stream detail page)
 *    ─────────────────────────────────────────────────
 *    The detail page renders inline Withdraw and Cancel buttons directly
 *    inside the page component:
 *
 *      <div className="flex gap-4">
 *        <button ... onClick={withdraw}>Withdraw</button>
 *        <button ... onClick={cancel}>Cancel</button>
 *      </div>
 *
 *    These buttons are tied to the full stream context (stream ID, amounts,
 *    etc.) and are appropriate for a dedicated detail view where the user
 *    is already focused on a single stream.
 *
 * 2. components/StreamCard.tsx (Dashboard list view)
 *    ─────────────────────────────────────────────────
 *    StreamCard is a read-only summary card; it does NOT currently render
 *    any action buttons. The dashboard list view (`/dashboard`) renders a
 *    list of StreamCards for at-a-glance status only. Users who want to
 *    act on a stream click through to the detail page.
 *
 * 3. components/StreamActions.tsx ← YOU ARE HERE (this file)
 *    ─────────────────────────────────────────────────────────
 *    StreamActions.tsx was identified as dead code during a codebase audit
 *    (see related dead-code issue). It was scaffolded but never wired into
 *    any page or referenced by any import.
 *
 *    Its INTENDED role (now formalised here) is to:
 *      a) Consolidate the withdraw/cancel/pause action buttons into one
 *         reusable component that both the stream detail page and StreamCard
 *         (if it ever gains inline actions) can import.
 *      b) Provide a single place to add future actions (e.g., top-up,
 *         share) without touching multiple pages.
 *      c) Encapsulate the loading/error state that each action button needs.
 *
 * ============================================================
 * NEXT STEPS — DEAD-CODE RESOLUTION
 * ============================================================
 *
 * Once the related dead-code issue is resolved, this component should be:
 *   1. Imported in src/app/stream/[id]/page.tsx to replace the inline
 *      action buttons there.
 *   2. Optionally imported in StreamCard.tsx if quick-action buttons are
 *      desired directly on the dashboard cards (design decision pending).
 *
 * Until that migration is done, this file documents the intended design and
 * provides the implementation ready to drop in.
 *
 * ============================================================
 * KEEPING THIS ACCURATE
 * ============================================================
 *
 * When the dead-code migration is completed:
 *   - Remove the "inline" action buttons from stream/[id]/page.tsx.
 *   - Update this JSDoc to reflect the new import locations.
 *   - Update __tests__/streamActions.test.tsx if the action signatures change.
 */

interface StreamActionsProps {
  /** The stream ID to act upon. */
  streamId: string;
  /** Whether this stream can currently be withdrawn from (has claimable balance). */
  canWithdraw?: boolean;
  /** Whether this stream is active and can be cancelled. */
  canCancel?: boolean;
  /** Called after a successful withdraw transaction. */
  onWithdraw?: (streamId: string) => void;
  /** Called after a successful cancel transaction. */
  onCancel?: (streamId: string) => void;
  /** Visual layout: "row" (default, side-by-side) or "column" (stacked). */
  layout?: "row" | "column";
}

/**
 * Renders the action button set for a single stream.
 *
 * Designed to be used in the stream detail page and optionally in StreamCard
 * for inline dashboard actions. See the JSDoc above for the full architecture
 * context and migration plan.
 */
export default function StreamActions({
  streamId,
  canWithdraw = true,
  canCancel = true,
  onWithdraw,
  onCancel,
  layout = "row",
}: StreamActionsProps) {
  const containerClass =
    layout === "column"
      ? "flex flex-col gap-3"
      : "flex flex-row gap-4";

  async function handleWithdraw() {
    // TODO: wire up sorostream.withdraw(streamId) once SDK integration lands.
    // For now, delegate to the callback so callers can handle the transaction.
    onWithdraw?.(streamId);
  }

  async function handleCancel() {
    // TODO: wire up sorostream.cancelStream(streamId) once SDK integration lands.
    onCancel?.(streamId);
  }

  return (
    <div className={containerClass} data-testid="stream-actions">
      {canWithdraw && (
        <button
          onClick={handleWithdraw}
          className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
          aria-label={`Withdraw earnings from stream ${streamId}`}
          data-testid="action-withdraw"
        >
          Withdraw
        </button>
      )}
      {canCancel && (
        <button
          onClick={handleCancel}
          className="flex-1 border border-red-600 text-red-400 py-3 rounded-lg font-medium hover:bg-red-900 transition-colors disabled:opacity-50"
          aria-label={`Cancel stream ${streamId}`}
          data-testid="action-cancel"
        >
          Cancel
        </button>
      )}
    </div>
import { useState, useCallback, useRef, useEffect } from "react";
import LiveCounter from "@/components/LiveCounter";
import WithdrawFeeBreakdownModal from "@/components/WithdrawFeeBreakdownModal";
import StreamCloneModal from "@/components/StreamCloneModal";
import {
  sorostream,
  claimableNow,
  getMockStream,
  getRemainingBalance,
  formatStellarAmount,
  truncateAddress,
} from "@/src/lib/sorostream";
import { useToast } from "@/src/lib/toast";
import { useSettings } from "@/src/context/SettingsContext";
import { useWallet } from "@/src/context/WalletContext";

/** Grace period in seconds before a cancel is submitted on-chain. */
const CANCEL_GRACE_SECONDS = 5;

interface StreamActionsProps {
  streamId: string;
  flowRate: number;
  lastWithdrawTime: string;
}

/** Thin spinner SVG rendered inside the button while a tx is pending */
function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 inline-block me-1.5 align-middle"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

export default function StreamActions({
  streamId,
  flowRate,
  lastWithdrawTime,
}: StreamActionsProps) {
  const [withdrawing, setWithdrawing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelPending, setCancelPending] = useState(false);
  const [confirmAmount, setConfirmAmount] = useState<number | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { addToast, upsertPersistentToast, removeToast } = useToast();
  const { withdrawThreshold } = useSettings();
  const { refetchBalance } = useWallet();

  const [optimisticClaimable, setOptimisticClaimable] = useState<number | null>(null);

  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelToastIdRef = useRef<number | null>(null);
  const undoRef = useRef(false);
  /**
   * Synchronous guard that is set to `true` as soon as a withdrawal begins,
   * before the first React re-render.  This prevents a second click from
   * sneaking through the gap between the initial `void executeWithdraw()` call
   * and the batched state update that sets `withdrawing = true`.
   */
  const withdrawingRef = useRef(false);
  const dismissCancelRef = useRef<HTMLButtonElement | null>(null);

  // Focus the safe "Cancel" action when the confirmation opens and let Escape
  // dismiss it without submitting anything.
  useEffect(() => {
    if (!showCancelConfirm) return;
    dismissCancelRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowCancelConfirm(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showCancelConfirm]);

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (submitTimeoutRef.current) clearTimeout(submitTimeoutRef.current);
    };
  }, []);

  // Close the "More actions" dropdown on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  const handleDuplicate = useCallback(() => {
    setMenuOpen(false);
    setShowCloneModal(true);
  }, []);

  const executeWithdraw = useCallback(async () => {
    const stream = getMockStream(streamId);
    const previousClaimable = stream ? Number(claimableNow(stream)) : null;

    // Set the ref synchronously so any re-entrant call in handleWithdraw is
    // blocked before the first React state update is flushed.
    withdrawingRef.current = true;
    setOptimisticClaimable(0);
    setWithdrawing(true);

    try {
      const result = await sorostream.withdraw();
      setOptimisticClaimable(null);
      refetchBalance();
      const stream = getMockStream(streamId);
      const token = stream?.token ?? "USDC";
      addToast(`Withdrawn ${result.amount} ${token} from stream #${streamId}`, "success");
    } catch {
      setOptimisticClaimable(null);
      void previousClaimable;
      addToast("Withdrawal failed. Please try again.", "error");
    } finally {
      withdrawingRef.current = false;
      setWithdrawing(false);
    }
  }, [streamId, addToast, refetchBalance]);

  const handleWithdraw = useCallback(() => {
    // Guard against double-clicks: the ref check is synchronous and blocks a
    // second invocation even before React has flushed the withdrawing=true
    // state update from the first click.
    if (withdrawing || withdrawingRef.current) return;

    const stream = getMockStream(streamId);
    const claimableStroops = stream ? Number(claimableNow(stream)) : 0;
    const claimableXlm = claimableStroops / 10_000_000;

    if (claimableXlm >= withdrawThreshold) {
      // Store raw stroops so the fee breakdown modal can compute the breakdown
      setConfirmAmount(claimableStroops);
    } else {
      void executeWithdraw();
    }
  }, [streamId, withdrawThreshold, withdrawing, executeWithdraw]);

  const handleConfirmed = useCallback(() => {
    setConfirmAmount(null);
    void executeWithdraw();
  }, [executeWithdraw]);

  const handleUndo = useCallback(() => {
    undoRef.current = true;

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (submitTimeoutRef.current) {
      clearTimeout(submitTimeoutRef.current);
      submitTimeoutRef.current = null;
    }
    if (cancelToastIdRef.current !== null) {
      removeToast(cancelToastIdRef.current);
      cancelToastIdRef.current = null;
    }

    setCancelPending(false);
    addToast("Cancellation undone.", "info");
  }, [removeToast, addToast]);

  const submitCancel = useCallback(async () => {
    setCancelPending(false);
    setCancelling(true);

    if (cancelToastIdRef.current !== null) {
      removeToast(cancelToastIdRef.current);
      cancelToastIdRef.current = null;
    }

    try {
      await sorostream.cancelStream(streamId);
      addToast(`Stream #${streamId} cancelled`, "success");
    } catch {
      addToast("Failed to cancel stream. Please try again.", "error");
    } finally {
      setCancelling(false);
    }
  }, [streamId, addToast, removeToast]);

  const handleCancelConfirmed = useCallback(() => {
    setShowCancelConfirm(false);
    if (cancelPending || cancelling) return;

    undoRef.current = false;
    setCancelPending(true);

    let secondsLeft = CANCEL_GRACE_SECONDS;
    const toastKey = `cancel-grace-${streamId}`;

    const showCountdown = (secs: number) => {
      const toastId = upsertPersistentToast(
        toastKey,
        `Cancelling stream #${streamId} in ${secs}s…`,
        "warning",
        { label: "Undo", onClick: handleUndo },
      );
      cancelToastIdRef.current = toastId;
    };

    showCountdown(secondsLeft);

    countdownIntervalRef.current = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft > 0) {
        showCountdown(secondsLeft);
      } else {
        clearInterval(countdownIntervalRef.current!);
        countdownIntervalRef.current = null;
      }
    }, 1000);

    submitTimeoutRef.current = setTimeout(() => {
      if (!undoRef.current) {
        void submitCancel();
      }
    }, CANCEL_GRACE_SECONDS * 1000);
  }, [cancelPending, cancelling, streamId, upsertPersistentToast, handleUndo, submitCancel]);

  return (
    <>
      {showCancelConfirm && (() => {
        const stream = getMockStream(streamId);
        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-confirm-title"
            aria-describedby="cancel-confirm-description"
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-sm space-y-4 border border-gray-200 dark:border-gray-700">
              <h2
                id="cancel-confirm-title"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                Cancel stream #{streamId}?
              </h2>
              <p
                id="cancel-confirm-description"
                className="text-sm text-gray-600 dark:text-gray-400"
              >
                Cancellation is irreversible. The stream stops immediately and the
                unstreamed balance is returned to the sender.
              </p>
              <dl className="text-sm space-y-1 rounded-lg bg-gray-100 dark:bg-gray-700 p-3">
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500 dark:text-gray-400">Stream ID</dt>
                  <dd className="text-gray-900 dark:text-white font-mono">#{streamId}</dd>
                </div>
                {stream && (
                  <>
                    <div className="flex justify-between gap-3">
                      <dt className="text-gray-500 dark:text-gray-400">Recipient</dt>
                      <dd
                        className="text-gray-900 dark:text-white font-mono"
                        title={stream.recipient}
                      >
                        {truncateAddress(stream.recipient)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-gray-500 dark:text-gray-400">Returned to sender</dt>
                      <dd className="text-gray-900 dark:text-white font-mono">
                        {formatStellarAmount(getRemainingBalance(stream))} {stream.token}
                      </dd>
                    </div>
                  </>
                )}
              </dl>
              <div className="flex gap-3 pt-1">
                <button
                  ref={dismissCancelRef}
                  type="button"
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCancelConfirmed}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  Confirm Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="text-center">
        <p className="text-gray-400 text-sm mb-2">Claimable now</p>
        <div className="text-3xl font-bold">
          <LiveCounter
            streamId={streamId}
            flowRate={flowRate}
            lastWithdrawTime={new Date(lastWithdrawTime)}
            optimisticOverride={optimisticClaimable}
          />
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleWithdraw}
          disabled={withdrawing || cancelling || cancelPending}
          aria-busy={withdrawing}
          className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
        >
          {withdrawing ? (
            <>
              <Spinner />
              Withdrawing…
            </>
          ) : (
            "Withdraw"
          )}
        </button>

        <button
          onClick={cancelPending ? handleUndo : () => setShowCancelConfirm(true)}
          disabled={cancelling || cancelPending || withdrawing}
          aria-busy={cancelling}
          aria-live="polite"
          className={`flex-1 py-3 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed ${
            cancelPending
              ? "bg-amber-600 text-white hover:bg-amber-700 focus-visible:ring-amber-500"
              : "border border-red-600 text-red-400 hover:bg-red-900 focus-visible:ring-red-500"
          }`}
        >
          {cancelling ? (
            <>
              <Spinner />
              Cancelling…
            </>
          ) : cancelPending ? (
            "Undo Cancel"
          ) : (
            "Cancel stream"
          )}
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="More stream actions"
            className="h-full px-3 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            <span aria-hidden="true">⋯</span>
          </button>
          {menuOpen && (
            <div
              role="menu"
              aria-label="Stream actions"
              className="absolute end-0 top-full mt-2 w-44 rounded-lg border border-gray-700 bg-gray-800 py-1 shadow-xl z-40"
            >
              <button
                type="button"
                role="menuitem"
                onClick={handleDuplicate}
                disabled={!getMockStream(streamId)}
                className="flex w-full items-center gap-2 px-4 py-2 text-start text-sm text-gray-200 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:bg-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Duplicate
              </button>
            </div>
          )}
        </div>
      </div>

      {confirmAmount !== null && (
        <WithdrawFeeBreakdownModal
          claimableStroops={confirmAmount}
          token={getMockStream(streamId)?.token ?? "USDC"}
          onConfirm={handleConfirmed}
          onCancel={() => setConfirmAmount(null)}
        />
      )}

      {showCloneModal && (() => {
        const stream = getMockStream(streamId);
        return stream ? (
          <StreamCloneModal stream={stream} onClose={() => setShowCloneModal(false)} />
        ) : null;
      })()}
    </>
  );
}
