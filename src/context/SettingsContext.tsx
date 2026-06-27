"use client";
/**
 * SettingsContext — lightweight user preferences stored in localStorage.
 *
 * Currently manages:
 *   showUsd: boolean  — whether to display USD equivalents alongside XLM amounts.
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

interface Settings {
  showUsd: boolean;
}

interface SettingsContextValue extends Settings {
  toggleShowUsd: () => void;
}

const defaultSettings: Settings = {
  showUsd: true,
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
    };
  } catch {
    return defaultSettings;
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  // Hydrate from localStorage after mount to avoid SSR mismatch.
  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const toggleShowUsd = useCallback(() => {
    setSettings((prev) => {
      const next = { ...prev, showUsd: !prev.showUsd };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors (e.g. private browsing quota)
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ ...settings, toggleShowUsd }),
    [settings, toggleShowUsd],
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
