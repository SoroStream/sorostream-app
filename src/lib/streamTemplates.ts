export interface SavedTemplate {
  id: string;
  label: string;
  description: string;
  days: number;
  hours: number;
  minutes: number;
  suggestedAmount?: string;
  recipient?: string;
  /** Token symbol this template was saved with, e.g. "USDC" or "XLM". */
  token?: string;
  /** Optional cliff date, stored as a datetime-local ISO string. */
  cliffDate?: string;
}

/** A template that ships with the app, shown in the picker beside saved ones. */
export interface BuiltInTemplate {
  label: string;
  description: string;
  days: number;
  hours: number;
  minutes: number;
  suggestedAmount?: string;
}

export const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  { label: "Biweekly payroll", description: "14 days", days: 14, hours: 0, minutes: 0, suggestedAmount: "5000" },
  { label: "Monthly salary", description: "30 days", days: 30, hours: 0, minutes: 0, suggestedAmount: "10000" },
  { label: "1-year vesting", description: "365 days", days: 365, hours: 0, minutes: 0, suggestedAmount: "100000" },
  { label: "Weekly stipend", description: "7 days", days: 7, hours: 0, minutes: 0, suggestedAmount: "500" },
];

/**
 * The built-in template whose label matches `label` (trimmed, ignoring case),
 * or undefined. A saved template must not reuse a built-in label, or the
 * picker would show two indistinguishable entries.
 */
export function findBuiltInTemplateByLabel(label: string): BuiltInTemplate | undefined {
  const wanted = label.trim().toLowerCase();
  if (!wanted) return undefined;
  return BUILT_IN_TEMPLATES.find((t) => t.label.toLowerCase() === wanted);
}

const STORAGE_KEY = "sorostream_templates";
const MAX_TEMPLATES = 20;

export function getSavedTemplates(): SavedTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t: unknown) =>
        typeof t === "object" &&
        t !== null &&
        typeof (t as Record<string, unknown>).id === "string" &&
        typeof (t as Record<string, unknown>).label === "string",
    ) as SavedTemplate[];
  } catch {
    return [];
  }
}

export function saveTemplate(
  template: Omit<SavedTemplate, "id">,
): SavedTemplate | null {
  const templates = getSavedTemplates();
  if (templates.length >= MAX_TEMPLATES) return null;
  const id = `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const newTemplate: SavedTemplate = { ...template, id };
  templates.push(newTemplate);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  return newTemplate;
}

export function deleteTemplate(id: string): void {
  const templates = getSavedTemplates().filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export function updateTemplate(
  id: string,
  updates: Partial<Omit<SavedTemplate, "id">>,
): boolean {
  const templates = getSavedTemplates();
  const idx = templates.findIndex((t) => t.id === id);
  if (idx === -1) return false;
  templates[idx] = { ...templates[idx], ...updates };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  return true;
}

export function templateToSeconds(t: SavedTemplate): number {
  return t.days * 86400 + t.hours * 3600 + t.minutes * 60;
}
