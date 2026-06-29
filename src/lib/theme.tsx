"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
  /** The currently applied theme. */
  theme: Theme;
  /** True when the user has not made an explicit choice and we follow the OS. */
  isSystem: boolean;
  /** Toggle between light and dark (sets an explicit user override). */
  toggle: () => void;
  /** Explicitly set a theme (user override, persisted to localStorage). */
  setTheme: (theme: Theme) => void;
  /** Clear the user override and follow the system preference again. */
  useSystemTheme: () => void;
}

const STORAGE_KEY = "theme";

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  isSystem: true,
  toggle: () => {},
  setTheme: () => {},
  useSystemTheme: () => {},
});

/** Read the OS-level colour-scheme preference. */
function getSystemTheme(): Theme {
  if (typeof window === "undefined" || !window.matchMedia) return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("light", theme === "light");
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  // `null` means "follow the system"; a string means an explicit user override.
  const [override, setOverride] = useState<Theme | null>(null);
  const [mounted, setMounted] = useState(false);

  // On mount, restore the user's stored choice or fall back to the OS preference.
  useEffect(() => {
    setMounted(true);
    let stored: Theme | null = null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "light" || raw === "dark") stored = raw;
    } catch {
      // ignore storage access errors (private browsing, etc.)
    }
    setOverride(stored);
    setThemeState(stored ?? getSystemTheme());
  }, []);

  // Apply the active theme to the document and persist the user's override.
  useEffect(() => {
    if (!mounted) return;
    applyTheme(theme);
    try {
      if (override) window.localStorage.setItem(STORAGE_KEY, override);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  }, [theme, override, mounted]);

  // While following the system, react live to OS theme changes.
  useEffect(() => {
    if (!mounted || override || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setThemeState(e.matches ? "dark" : "light");
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [override, mounted]);

  // Keep multiple tabs in sync when the stored preference changes elsewhere.
  useEffect(() => {
    if (!mounted) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const next = e.newValue === "light" || e.newValue === "dark" ? e.newValue : null;
      setOverride(next);
      setThemeState(next ?? getSystemTheme());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [mounted]);

  const setTheme = (next: Theme) => {
    setOverride(next);
    setThemeState(next);
  };

  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

  const useSystemTheme = () => {
    setOverride(null);
    setThemeState(getSystemTheme());
  };

  return (
    <ThemeContext.Provider value={{ theme, isSystem: override === null, toggle, setTheme, useSystemTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
