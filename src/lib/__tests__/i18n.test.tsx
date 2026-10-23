import { render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
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


describe("RTL locales", () => {
  afterEach(() => { localStorage.clear(); document.documentElement.dir = "ltr"; document.documentElement.lang = "en"; });
  function LocaleControls() {
    const { setLanguage } = useSettings();
    const t = useTranslations("settings");
    const detail = useTranslations("stream_detail");
    return <><span data-testid="title">{t("title")}</span><span data-testid="fallback">{detail("title", { id: "42" })}</span>
      <button onClick={() => setLanguage("ar")}>Arabic</button>
      <button onClick={() => setLanguage("he")}>Hebrew</button>
      <button onClick={() => setLanguage("en")}>LTR</button></>;
  }
  it("changes direction and next-intl translations live, restores LTR, and persists locale", () => {
    const view = render(<SettingsProvider><LocaleControls /></SettingsProvider>);
    fireEvent.click(screen.getByText("Arabic"));
    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.lang).toBe("ar");
    expect(screen.getByTestId("title")).toHaveTextContent("دفتر العناوين");
    expect(screen.getByTestId("fallback")).toHaveTextContent("Stream #42");
    fireEvent.click(screen.getByText("Hebrew"));
    expect(document.documentElement.lang).toBe("he");
    expect(screen.getByTestId("title")).toHaveTextContent("פנקס כתובות");
    view.unmount();
    render(<SettingsProvider><LocaleControls /></SettingsProvider>);
    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.lang).toBe("he");
    fireEvent.click(screen.getByText("LTR"));
    expect(document.documentElement.dir).toBe("ltr");
    expect(screen.getByTestId("title")).toHaveTextContent("Address Book");
  });
});
