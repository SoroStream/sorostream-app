"use client";
/**
 * SettingsContext — lightweight user preferences stored in localStorage.
 *
 * Manages:
 *   showUsd: boolean           — display USD equivalents alongside XLM amounts.
 *   withdrawThreshold: number  — XLM amount above which a typed confirmation is required.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "sorostream-settings";

/**
 * Default keyboard shortcut bindings.
 * Key = action identifier, Value = key (lowercase) or modifier combination.
 */
export type ShortcutId = "newStream" | "search" | "help" | "dashboard" | "streams" | "home";
export type ShortcutMap = Record<ShortcutId, string>;

export const DEFAULT_SHORTCUTS: ShortcutMap = {
  newStream: "n",
  search: "/",
  help: "shift+?",
  dashboard: "g d",
  streams: "g s",
  home: "g h",
};

interface Settings {
  showUsd: boolean;
  withdrawThreshold: number;
  keyboardShortcuts: ShortcutMap;
}

interface SettingsContextValue extends Settings {
  toggleShowUsd: () => void;
  setWithdrawThreshold: (value: number) => void;
  setKeyboardShortcuts: (shortcuts: ShortcutMap) => void;
  resetKeyboardShortcuts: () => void;
  getShortcutLabel: (id: ShortcutId) => string;
}

const defaultSettings: Settings = {
  showUsd: true,
  withdrawThreshold: 1000,
  keyboardShortcuts: DEFAULT_SHORTCUTS,
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

function loadSettings(): Settings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      showUsd: parsed.showUsd ?? defaultSettings.showUsd,
      withdrawThreshold: parsed.withdrawThreshold ?? defaultSettings.withdrawThreshold,
      keyboardShortcuts: parsed.keyboardShortcuts ?? defaultSettings.keyboardShortcuts,
    };
  } catch {
    return defaultSettings;
  }
}

function persist(next: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors (e.g. private browsing quota)
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const toggleShowUsd = useCallback(() => {
    setSettings((prev) => {
      const next = { ...prev, showUsd: !prev.showUsd };
      persist(next);
      return next;
    });
  }, []);

  const setWithdrawThreshold = useCallback((value: number) => {
    setSettings((prev) => {
      const next = { ...prev, withdrawThreshold: value };
      persist(next);
      return next;
    });
  }, []);

  const setKeyboardShortcuts = useCallback((shortcuts: ShortcutMap) => {
    setSettings((prev) => {
      const next = { ...prev, keyboardShortcuts: shortcuts };
      persist(next);
      return next;
    });
  }, []);

  const resetKeyboardShortcuts = useCallback(() => {
    setSettings((prev) => {
      const next = { ...prev, keyboardShortcuts: DEFAULT_SHORTCUTS };
      persist(next);
      return next;
    });
  }, []);

  const getShortcutLabel = useCallback(
    (id: ShortcutId): string => {
      const raw = settings.keyboardShortcuts[id] ?? DEFAULT_SHORTCUTS[id];
      return raw
        .replace(/^g /, "G then ")
        .replace(/shift\+/, "Shift+")
        .replace(/\+/g, "+");
    },
    [settings.keyboardShortcuts],
  );

  const value = useMemo(
    () => ({
      ...settings,
      toggleShowUsd,
      setWithdrawThreshold,
      setKeyboardShortcuts,
      resetKeyboardShortcuts,
      getShortcutLabel,
    }),
    [settings, toggleShowUsd, setWithdrawThreshold, setKeyboardShortcuts, resetKeyboardShortcuts, getShortcutLabel],
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
