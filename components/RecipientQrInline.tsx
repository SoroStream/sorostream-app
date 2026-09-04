"use client";

/**
 * RecipientQrInline — Displays an inline collapsible QR code for the
 * recipient's Stellar address on the stream detail page (#452).
 *
 * The QR is rendered to a <canvas> using the `qrcode` package and encodes
 * a `stellar:<address>` URI so it can be imported directly into compatible
 * Stellar wallets.
 */

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

interface RecipientQrInlineProps {
  recipient: string;
}

export default function RecipientQrInline({ recipient }: RecipientQrInlineProps) {
  const [expanded, setExpanded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!expanded || !canvasRef.current) return;
    const uri = recipient.startsWith("G") ? `stellar:${recipient}` : recipient;
    QRCode.toCanvas(canvasRef.current, uri, {
      width: 200,
      margin: 2,
      color: { dark: "#ffffff", light: "#1f2937" },
    });
  }, [expanded, recipient]);

  function handleCopy() {
    navigator.clipboard?.writeText(recipient).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `recipient-qr-${recipient.slice(0, 8)}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="mt-3 border border-gray-700 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls="recipient-qr-content"
        className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-inset"
      >
        <span className="flex items-center gap-2">
          {/* QR icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <path d="M14 14h7v7M14 14v4M18 14h3" />
          </svg>
          Recipient QR Code
        </span>
        <span
          aria-hidden="true"
          className="text-xs transition-transform duration-200"
          style={{ display: "inline-block", transform: expanded ? "rotate(0deg)" : "rotate(-90deg)" }}
        >
          ▼
        </span>
      </button>

      {expanded && (
        <div
          id="recipient-qr-content"
          className="px-4 pb-4 pt-2 bg-gray-800/50 flex flex-col items-center gap-3"
        >
          <canvas
            ref={canvasRef}
            width={200}
            height={200}
            className="rounded-lg"
            aria-label={`QR code for Stellar address ${recipient}`}
          />
          <p className="text-xs text-gray-400 text-center font-mono break-all max-w-[200px]">
            {recipient}
          </p>
          <p className="text-xs text-gray-500 text-center">
            Scan to share the recipient&apos;s Stellar address
          </p>
          <div className="flex gap-2 w-full">
            <button
              onClick={handleCopy}
              className="flex-1 text-xs border border-gray-600 text-gray-300 py-1.5 rounded-lg hover:bg-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
              {copied ? "Copied!" : "Copy Address"}
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 text-xs bg-green-700 text-white py-1.5 rounded-lg hover:bg-green-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
              Download PNG
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
