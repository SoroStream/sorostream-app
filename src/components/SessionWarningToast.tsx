"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/src/context/WalletContext";

export function SessionWarningToast() {
  const { showSessionWarning5Min, sessionExpired, clearSessionExpired, reconnect } = useWallet();
  const [dismissed, setDismissed] = useState(false);
  const [expiredDismissed, setExpiredDismissed] = useState(false);

  // Reset dismissed state when warning changes
  useEffect(() => {
    setDismissed(false);
  }, [showSessionWarning5Min]);

  // Reset expired dismissed when sessionExpired changes
  useEffect(() => {
    setExpiredDismissed(false);
  }, [sessionExpired]);

  // Show session expired toast
  if (sessionExpired && !expiredDismissed) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="fixed top-6 right-6 z-40 max-w-sm animate-slide-in-right"
      >
        <div className="bg-red-900/80 border border-red-700 rounded-lg shadow-lg p-4 backdrop-blur-sm">
          <div className="flex gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg
                className="h-5 w-5 text-red-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-red-50">
                Wallet session expired
              </h3>
              <p className="mt-1 text-xs text-red-200">
                Your wallet session expired. We&apos;re reconnecting you automatically — you won&apos;t lose your place. If that doesn&apos;t work, use Reconnect Now.
              </p>
               <button
                 onClick={() => {
                   setExpiredDismissed(true);
                   void reconnect();
                 }}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-700 hover:bg-red-600 text-red-50 text-xs font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                Reconnect Now
              </button>
            </div>
            <button
              onClick={() => {
                setExpiredDismissed(true);
                clearSessionExpired();
              }}
              aria-label="Dismiss expired session notification"
              className="flex-shrink-0 text-red-300 hover:text-red-50 transition-colors p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
            >
              <svg
                className="h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!showSessionWarning5Min || dismissed) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed top-6 right-6 z-40 max-w-sm animate-slide-in-right"
    >
      <div className="bg-amber-900/80 border border-amber-700 rounded-lg shadow-lg p-4 backdrop-blur-sm">
        <div className="flex gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <svg
              className="h-5 w-5 text-amber-400 animate-pulse"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-amber-50">
              Wallet session expiring soon
            </h3>
            <p className="mt-1 text-xs text-amber-200">
              Your wallet session will expire in 5 minutes. A modal will appear before it expires.
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss session warning"
            className="flex-shrink-0 text-amber-300 hover:text-amber-50 transition-colors p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
          >
            <svg
              className="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
