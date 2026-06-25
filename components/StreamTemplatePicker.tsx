"use client";

interface Template {
  label: string;
  description: string;
  days: number;
  hours: number;
  minutes: number;
  suggestedAmount?: string;
}

const TEMPLATES: Template[] = [
  { label: "Biweekly payroll", description: "14 days", days: 14, hours: 0, minutes: 0, suggestedAmount: "5000" },
  { label: "Monthly salary", description: "30 days", days: 30, hours: 0, minutes: 0, suggestedAmount: "10000" },
  { label: "1-year vesting", description: "365 days", days: 365, hours: 0, minutes: 0, suggestedAmount: "100000" },
  { label: "Weekly stipend", description: "7 days", days: 7, hours: 0, minutes: 0, suggestedAmount: "500" },
];

interface StreamTemplatePickerProps {
  onSelect: (seconds: number, amount?: string) => void;
}

export default function StreamTemplatePicker({ onSelect }: StreamTemplatePickerProps) {
  return (
    <div className="space-y-2">
      <p className="text-gray-400 text-sm block mb-2">Quick Templates</p>
      <div className="grid grid-cols-2 gap-2">
        {TEMPLATES.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => onSelect(t.days * 86400 + t.hours * 3600 + t.minutes * 60, t.suggestedAmount)}
            className="text-left bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 hover:border-green-500 transition-colors"
          >
            <p className="text-white text-sm font-medium">{t.label}</p>
            <p className="text-gray-400 text-xs">{t.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
