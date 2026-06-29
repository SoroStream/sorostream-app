"use client";

import { useTheme } from "@/src/lib/theme";

export default function ThemeToggle() {
  const { theme, isSystem, toggle, useSystemTheme } = useTheme();

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={toggle}
        className="text-sm text-gray-300 hover:text-white transition-colors rounded-md px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        title={isSystem ? "Following system preference" : "Theme set manually"}
      >
        {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
      </button>
      {!isSystem && (
        <button
          onClick={useSystemTheme}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors rounded-md px-1.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          aria-label="Follow system theme preference"
          title="Use system preference"
        >
          Auto
        </button>
      )}
    </div>
  );
}
