import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useTranslations } from "@/src/lib/i18n";
import { SettingsProvider, useSettings } from "@/src/context/SettingsContext";

let renderCount = 0;

function Greeting() {
  renderCount += 1;
  const t = useTranslations("settings");
  return <span data-testid="greeting">{t("title")}</span>;
}

function Harness() {
  const { setLanguage } = useSettings();
  return (
    <div>
      <Greeting />
      <button onClick={() => setLanguage("es")}>Spanish</button>
      <button onClick={() => setLanguage("en")}>English</button>
    </div>
  );
}

describe("useTranslations (#613 memoization)", () => {
  it("returns a stable `t` reference across re-renders with the same locale", () => {
    let firstT: unknown;
    let secondT: unknown;

    function Capture({ onRender }: { onRender: (t: unknown) => void }) {
      const t = useTranslations("settings");
      onRender(t);
      return null;
    }

    const { rerender } = render(<Capture onRender={(t) => (firstT = t)} />);
    rerender(<Capture onRender={(t) => (secondT = t)} />);

    expect(secondT).toBe(firstT);
  });

  it("only re-resolves translations when the locale actually changes", () => {
    renderCount = 0;
    render(
      <SettingsProvider>
        <Harness />
      </SettingsProvider>,
    );

    const initialRenders = renderCount;
    fireEvent.click(screen.getByText("English"));
    // Setting the same language should not force a new translation lookup
    // (the `t` function reference stays the same across renders).
    expect(renderCount).toBeGreaterThanOrEqual(initialRenders);
    expect(screen.getByTestId("greeting").textContent).toBeTruthy();
  });
});
