/**
 * Tests for StreamShareButtons' handleNativeShare AbortError handling (#888).
 *
 * Verifies that:
 *   - A user-dismissed share sheet (AbortError) produces no error toast.
 *   - A real failure (non-AbortError, e.g. NotAllowedError) does produce an
 *     error toast.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import StreamShareButtons from "../StreamShareButtons";

// ── Mocks ──────────────────────────────────────────────────────────────────

const addToast = vi.fn();

vi.mock("@/src/lib/toast", () => ({
  useToast: () => ({ addToast }),
}));

vi.mock("@/src/lib/clipboard", () => ({
  copyToClipboard: vi.fn().mockResolvedValue(true),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function renderButtons(streamId = "stream-42") {
  return render(<StreamShareButtons streamId={streamId} />);
}

/** Returns the "Share" button (native share or fallback). */
function getShareButton() {
  return screen.getByRole("button", { name: /share/i });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("StreamShareButtons handleNativeShare (#888)", () => {
  beforeEach(() => {
    addToast.mockClear();
    // Ensure navigator.share is present so the native path is exercised.
    vi.stubGlobal("navigator", {
      ...navigator,
      share: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows no error toast when navigator.share rejects with AbortError (user dismissed)", async () => {
    const abortError = new DOMException("Share cancelled by user", "AbortError");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator.share as any).mockRejectedValue(abortError);

    renderButtons();

    await act(async () => {
      fireEvent.click(getShareButton());
    });

    expect(addToast).not.toHaveBeenCalled();
  });

  it("shows an error toast when navigator.share rejects with a non-AbortError (real failure)", async () => {
    const permissionError = new DOMException(
      "Permission denied",
      "NotAllowedError",
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator.share as any).mockRejectedValue(permissionError);

    renderButtons();

    await act(async () => {
      fireEvent.click(getShareButton());
    });

    expect(addToast).toHaveBeenCalledOnce();
    expect(addToast).toHaveBeenCalledWith(
      "Share failed. Try the copy button instead.",
      "error",
    );
  });

  it("shows no toast when navigator.share resolves (share completed successfully)", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator.share as any).mockResolvedValue(undefined);

    renderButtons();

    await act(async () => {
      fireEvent.click(getShareButton());
    });

    expect(addToast).not.toHaveBeenCalled();
  });

  it("AbortError with a plain Error (not DOMException) is also silenced", async () => {
    // navigator.share can throw a plain Error whose name is "AbortError" in
    // some browsers — the guard only checks err.name, not the constructor.
    const plainAbort = new Error("Aborted");
    plainAbort.name = "AbortError";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator.share as any).mockRejectedValue(plainAbort);

    renderButtons();

    await act(async () => {
      fireEvent.click(getShareButton());
    });

    expect(addToast).not.toHaveBeenCalled();
  });
});
