"use client";

import { useState } from "react";

interface DurationPickerProps {
  /** Called with the total duration in seconds whenever it changes. */
  onChange: (seconds: number) => void;
  /** Optional external error message to display (e.g. from parent form validation). */
  error?: string;
}

/**
 * Days / hours / minutes input that converts to total seconds.
 * Shows an inline error when all fields are 0 (zero-duration guard).
 */
export default function DurationPicker({ onChange, error: externalError }: DurationPickerProps) {
  const [days, setDays] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [touched, setTouched] = useState(false);

  function update(d: number, h: number, m: number) {
    const seconds = d * 86_400 + h * 3_600 + m * 60;
    onChange(seconds);
  }

  const totalSeconds = days * 86_400 + hours * 3_600 + minutes * 60;
  const inlineError =
    touched && totalSeconds === 0
      ? "Duration must be greater than 0."
      : null;

  // Surface either the parent-level error or the local inline error
  const displayError = externalError || inlineError;

  return (
    <div>
      <div
        className="flex gap-2"
        role="group"
        aria-label="Stream duration"
      >
        {(
          [
            { label: "Days", value: days, set: setDays, max: 3650 },
            { label: "Hours", value: hours, set: setHours, max: 23 },
            { label: "Minutes", value: minutes, set: setMinutes, max: 59 },
          ] as const
        ).map(({ label, value, set, max }) => (
          <label key={label} className="flex flex-col gap-1 flex-1">
            <span className="text-xs text-slate-500">{label}</span>
            <input
              type="number"
              min={0}
              max={max}
              value={value}
              onChange={(e) => {
                const v = Math.max(0, Math.min(max, Number(e.target.value)));
                set(v);
                setTouched(true);
                if (label === "Days") update(v, hours, minutes);
                else if (label === "Hours") update(days, v, minutes);
                else update(days, hours, v);
              }}
              onBlur={() => setTouched(true)}
              className={`rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                displayError
                  ? "border-red-500 focus:ring-red-500"
                  : "border-slate-300"
              }`}
              aria-label={label}
              aria-invalid={!!displayError}
            />
          </label>
        ))}
      </div>
      {displayError && (
        <p
          id="duration-error"
          className="text-red-400 text-sm mt-1"
          role="alert"
          aria-live="polite"
        >
          {displayError}
        </p>
      )}
    </div>
  );
}
