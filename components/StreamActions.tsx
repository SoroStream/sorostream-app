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
  );
}
