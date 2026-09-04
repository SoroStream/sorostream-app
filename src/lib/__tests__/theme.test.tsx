import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "@/src/lib/theme";

function ThemeConsumer() {
  const { theme, isSystem, toggle, useSystemTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="system">{String(isSystem)}</span>
      <button onClick={toggle}>Toggle</button>
      <button onClick={useSystemTheme}>System</button>
    </div>
  );
}

function installMatchMedia(prefersDark: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches:
      query === "(prefers-color-scheme: dark)"
        ? prefersDark
        : query === "(prefers-contrast: more)"
        ? false
        : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as typeof window.matchMedia;
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.style.colorScheme = "";
  });

  it("follows the system colour scheme when no manual override exists", async () => {
    installMatchMedia(true);

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("theme")).toHaveTextContent("dark");
      expect(screen.getByTestId("system")).toHaveTextContent("true");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    expect(localStorage.getItem("theme")).toBeNull();
  });

  it("persists a manual toggle to localStorage", async () => {
    installMatchMedia(false);

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("theme")).toHaveTextContent("light");
    });

    fireEvent.click(screen.getByRole("button", { name: "Toggle" }));

    await waitFor(() => {
      expect(screen.getByTestId("theme")).toHaveTextContent("dark");
      expect(screen.getByTestId("system")).toHaveTextContent("false");
      expect(localStorage.getItem("theme")).toBe("dark");
    });

    fireEvent.click(screen.getByRole("button", { name: "System" }));

    await waitFor(() => {
      expect(screen.getByTestId("system")).toHaveTextContent("true");
      expect(localStorage.getItem("theme")).toBeNull();
    });
  });
});
