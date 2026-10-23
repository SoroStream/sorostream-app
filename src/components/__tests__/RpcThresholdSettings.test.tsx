import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import RpcThresholdSettings from "../RpcThresholdSettings";
import { PreferencesProvider, PREFERENCES_STORAGE_KEY } from "@/src/context/PreferencesContext";
afterEach(() => localStorage.clear());
it("persists threshold edits and lets users restore environment defaults", () => {
  const view = render(<PreferencesProvider><RpcThresholdSettings /></PreferencesProvider>);
  fireEvent.change(screen.getByLabelText("Degraded latency (milliseconds)"), { target: { value: "800" } });
  fireEvent.change(screen.getByLabelText("Unreachable banner delay (seconds)"), { target: { value: "15" } });
  expect(JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY)!)).toMatchObject({ rpcDegradedMs: 800, rpcUnreachableBannerSeconds: 15 });
  view.unmount();
  render(<PreferencesProvider><RpcThresholdSettings /></PreferencesProvider>);
  expect(screen.getByLabelText("Degraded latency (milliseconds)")).toHaveValue(800);
  fireEvent.change(screen.getByLabelText("Degraded latency (milliseconds)"), { target: { value: "" } });
  expect(JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY)!)).toMatchObject({ rpcDegradedMs: null });
});
