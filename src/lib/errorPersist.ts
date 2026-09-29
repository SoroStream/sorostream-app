"use client";
/**
 * errorPersist — persists the last fatal load error for a stream detail
 * view to sessionStorage, keyed by stream id (#618).
 *
 * Without this, navigating away from an errored stream page (e.g. via
 * the browser back/forward buttons, or a Link elsewhere in the app) and
 * back drops the error state entirely on unmount, so the user briefly
 * sees a bare loading skeleton with no indication anything went wrong
 * until the retry fetch settles again. Persisting the message means the
 * same error is shown immediately on remount and is cleared as soon as
 * the retry succeeds.
 *
 * Mirrors the pure-function + hook pattern used by useFormPersist.ts for
 * the create-stream draft.
 */

const STORAGE_PREFIX = "sorostream_stream_error_";

function keyFor(streamId: string): string {
  return `${STORAGE_PREFIX}${streamId}`;
}

/** Read the persisted error message for `streamId`, or null if none / unavailable. */
export function readPersistedStreamError(streamId: string): string | null {
  if (typeof window === "undefined" || !streamId) return null;
  try {
    return window.sessionStorage.getItem(keyFor(streamId));
  } catch {
    return null;
  }
}

/** Persist `message` as the last known error for `streamId`. */
export function writePersistedStreamError(streamId: string, message: string): void {
  if (typeof window === "undefined" || !streamId) return;
  try {
    window.sessionStorage.setItem(keyFor(streamId), message);
  } catch {
    // sessionStorage may be unavailable (private mode quota, security policy)
  }
}

/** Clear the persisted error for `streamId` (call on a successful load). */
export function clearPersistedStreamError(streamId: string): void {
  if (typeof window === "undefined" || !streamId) return;
  try {
    window.sessionStorage.removeItem(keyFor(streamId));
  } catch {
    // ignore
  }
}
