/**
 * Copies text to the clipboard. Uses the async Clipboard API when available
 * and falls back to document.execCommand("copy") via a hidden textarea for
 * older browsers or insecure contexts. Never throws.
 * Returns true on success, false when neither method worked.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied or unavailable — fall through to execCommand.
    }
  }

  if (typeof document === "undefined") return false;
  let textarea: HTMLTextAreaElement | null = null;
  try {
    textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.setAttribute("aria-hidden", "true");
    textarea.style.cssText =
      "position:fixed;top:-9999px;left:-9999px;opacity:0;";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange?.(0, text.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    if (textarea && textarea.parentNode) textarea.parentNode.removeChild(textarea);
  }
}
