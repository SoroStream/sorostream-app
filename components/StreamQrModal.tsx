"use client";

import { useEffect, useRef } from "react";
import { useFocusTrap } from "@/src/lib/useFocusTrap";
import QRCode from "qrcode";

interface StreamQrModalProps {
  open: boolean;
  onClose: () => void;
  recipient: string;
}

export default function StreamQrModal({
  open,
  onClose,
  recipient,
}: StreamQrModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(dialogRef, open, onClose);

  useEffect(() => {
    if (!open || !canvasRef.current) return;

    // Encode the recipient's Stellar address so it can be scanned and
    // shared without wallet access. Falls back to a Stellar URI scheme.
    const uri = recipient.startsWith("G") ? `stellar:${recipient}` : recipient;

    QRCode.toCanvas(canvasRef.current, uri, {
      width: 280,
      margin: 2,
      color: { dark: "#ffffff", light: "#1f2937" },
    });
  }, [open, recipient]);

  function handleDownload() {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `recipient-qr-${recipient.slice(0, 8)}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  }

  function handleCopy() {
    if (!recipient) return;
    navigator.clipboard?.writeText(recipient);
  }

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full mx-4 space-y-4 border border-gray-200 dark:border-gray-700">
        <h2 id="qr-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white text-center">
          Recipient Address QR
        </h2>

        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            className="rounded-lg"
            width={280}
            height={280}
          />
        </div>

        <p className="text-gray-600 dark:text-gray-400 text-xs text-center break-all font-mono">
          {recipient}
        </p>

        <p className="text-gray-600 dark:text-gray-400 text-xs text-center">
          Scan to get the recipient&apos;s Stellar address
        </p>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleCopy}
            className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 dark:focus-visible:ring-offset-gray-900"
          >
            Copy Address
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 dark:focus-visible:ring-offset-gray-900"
          >
            Download PNG
          </button>
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 dark:focus-visible:ring-offset-gray-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
