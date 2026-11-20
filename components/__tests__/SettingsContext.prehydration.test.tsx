/**
 * Issue #867 — SettingsProvider pre-hydration window
 *
 * SettingsProvider initialises state to `defaultSettings` and only calls
 * `setSettings(loadSettings())` inside a `useEffect`, so on the very first
 * render every consumer receives the defaults rather than persisted values.
 *
 * These tests document that transient-default-then-hydrate sequence and act
 * as a regression guard: if the initialisation strategy ever changes (e.g.
 * lazy initialiser or SSR hydration) the tests must be updated intentionally.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, act } from "@testing-library/react";
import { useSettings, SettingsProvider } from "@/src/context/SettingsContext";

// A minimal consumer that records every distinct `preferredTheme` value it
// sees so we can assert the before- and after-hydration sequence.
function ThemeObserver({ log }: { log: string[] }) {
  const { preferredTheme } = useSettings();
  // Push on every render (strict-mode double-invoke is not an issue here
  // because we care only about the unique sequence, not raw call count).
  const last = log[log.length - 1];
  if (last !== preferredTheme) log.push(preferredTheme);
  return <span data-testid="theme">{preferredTheme}</span>;
}

afterEach(() => { localStorage.clear(); cleanup(); });

describe("SettingsProvider pre-hydration (#867)", () => {
  it("renders defaultSettings on the first synchronous render before the effect runs", () => {
    // Write a non-default theme to storage before mounting.
    localStorage.setItem(
      "sorostream-settings",
      JSON.stringify({ preferredTheme: "dark" }),
    );

    const log: string[] = [];
    render(
      <SettingsProvider>
        <ThemeObserver log={log} />
      </SettingsProvider>,
    );

    // The first entry in the log must be the default ("system"), proving that
    // the initial render did NOT read from localStorage.
    expect(log[0]).toBe("system");
  });

  it("hydrates to persisted values after the effect runs", async () => {
    localStorage.setItem(
      "sorostream-settings",
      JSON.stringify({ preferredTheme: "light" }),
    );

    render(
      <SettingsProvider>
        <ThemeObserver log={[]} />
      </SettingsProvider>,
    );

    // After effects flush the displayed value must match what was stored.
    expect(await screen.findByTestId("theme")).toHaveTextContent("light");
  });

  it("produces a default → persisted sequence when storage has a non-default value", async () => {
    localStorage.setItem(
      "sorostream-settings",
      JSON.stringify({ preferredTheme: "dark" }),
    );

    const log: string[] = [];
    render(
      <SettingsProvider>
        <ThemeObserver log={log} />
      </SettingsProvider>,
    );

    // Wait for the hydration effect to complete.
    await screen.findByText("dark");

    expect(log).toEqual(["system", "dark"]);
  });

  it("stays on the default value throughout when storage is empty", async () => {
    // No localStorage entry — hydration should not change the value.
    const log: string[] = [];
    render(
      <SettingsProvider>
        <ThemeObserver log={log} />
      </SettingsProvider>,
    );

    // Allow effects to flush.
    await act(async () => {});

    // Should never have changed: only one unique value recorded.
    expect(log).toEqual(["system"]);
    expect(screen.getByTestId("theme")).toHaveTextContent("system");
  });
});
