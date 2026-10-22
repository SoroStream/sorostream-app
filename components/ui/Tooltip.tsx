"use client";

import { useId, useState, type KeyboardEvent, type ReactNode } from "react";

interface TooltipProps {
  /** Accessible name for the trigger button. */
  label: string;
  /** Tooltip content. */
  children: ReactNode;
  /** Horizontal alignment of the tooltip relative to the trigger. */
  align?: "left" | "right";
  /** Optional classes for the trigger button. */
  triggerClassName?: string;
}

/**
 * Accessible "?" tooltip. Opens on hover, keyboard focus, or Enter/Space,
 * and closes on Escape or blur so keyboard-only users can read it.
 */
export default function Tooltip({
  label,
  children,
  align = "left",
  triggerClassName = "text-gray-500 hover:text-gray-300 text-xs border border-gray-600 rounded-full w-4 h-4 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500",
}: TooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        className={triggerClassName}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
      >
        ?
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className={`absolute ${align === "right" ? "right-0" : "left-0"} bottom-6 block w-64 bg-gray-700 border border-gray-600 rounded-lg p-3 text-xs text-gray-300 leading-relaxed z-10 shadow-lg`}
        >
          {children}
        </span>
      )}
    </span>
  );
}
