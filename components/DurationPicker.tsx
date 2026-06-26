"use client";

import { useState } from "react";

interface DurationPickerProps {
  /** Called with the total duration in seconds whenever it changes. */
  onChange: (seconds: number) => void;
}

/**
 * Days / hours / minutes input that converts to total seconds.
 */
export default function DurationPicker({ onChange }: DurationPickerProps) {
  const [days, setDays] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);

  function update(d: number, h: number, m: number) {
    onChange(d * 86_400 + h * 3_600 + m * 60);
  }

  return (
    <div className="flex gap-2">
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
              if (label === "Days") update(v, hours, minutes);
              else if (label === "Hours") update(days, v, minutes);
              else update(days, hours, v);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            aria-label={label}
          />
        </label>
      ))}
    </div>
  );
}
