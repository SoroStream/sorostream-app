"use client";
/**
 * ContractVersionBanner — sticky banner shown when the deployed SoroStream
 * contract's version doesn't match the version this build expects
 * (NEXT_PUBLIC_CONTRACT_VERSION). Prompts the user to refresh so they pick
 * up the client code built against the new contract.
 *
 * Dismissal is per mismatch and lasts for the browser tab's session: the
 * dismissed *deployed* version is kept in sessionStorage under
 * DISMISSED_VERSION_KEY. The banner stays hidden while the contract still
 * reports that version, including across reloads in the same tab, and
 * shows again when a later upgrade makes it report a different version.
 * Closing the tab clears it.
 */
import { useState } from "react";
import { useContractVersion } from "@/src/lib/useContractVersion";

export const DISMISSED_VERSION_KEY = "sorostream-contract-version-dismissed";

function readDismissedVersion(): string | null {
  try {
    return typeof window === "undefined"
      ? null
      : window.sessionStorage.getItem(DISMISSED_VERSION_KEY);
  } catch {
    return null;
  }
}

export default function ContractVersionBanner() {
  const { mismatch, deployedVersion } = useContractVersion();
  const [dismissedVersion, setDismissedVersion] = useState(readDismissedVersion);

  if (!mismatch || deployedVersion === dismissedVersion) return null;

  const dismiss = () => {
    setDismissedVersion(deployedVersion);
    try {
      if (deployedVersion !== null) {
        window.sessionStorage.setItem(DISMISSED_VERSION_KEY, deployedVersion);
      }
    } catch {
      // Storage unavailable (private mode, quota): dismissal lasts until unmount.
    }
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="sticky top-14 z-40 w-full bg-amber-900/90 border-b border-amber-700 text-amber-100 text-sm text-center py-2 px-4 flex items-center justify-center gap-3 flex-wrap"
    >
      <span>
        <span className="font-semibold">⚠ Update available</span> — A new
        version of the SoroStream contract is available. Please refresh.
      </span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="bg-amber-700 hover:bg-amber-600 text-white text-xs font-medium px-3 py-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        Refresh
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss update notice"
        className="text-amber-200 hover:text-white text-xs font-medium px-2 py-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        Dismiss
      </button>
    </div>
  );
}
