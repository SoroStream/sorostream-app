/**
 * Tests for WebVitalsReporter (#917).
 *
 * Verifies:
 *   1. registerVitals is called exactly once when the component mounts.
 *   2. A rejected registerVitals promise is caught and does not cause the
 *      component to throw or unmount abnormally.
 */
import { render, cleanup, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Hoist the mock fn so vi.mock factory can reference it ─────────────────────
const { mockRegisterVitals } = vi.hoisted(() => ({
  mockRegisterVitals: vi.fn(),
}));

vi.mock("@/src/lib/vitals", () => ({
  registerVitals: mockRegisterVitals,
}));

// Import after mock is in place.
import WebVitalsReporter from "../WebVitalsReporter";

describe("WebVitalsReporter (#917)", () => {
  beforeEach(() => {
    mockRegisterVitals.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("calls registerVitals exactly once on mount", async () => {
    mockRegisterVitals.mockResolvedValue(undefined);

    await act(async () => {
      render(<WebVitalsReporter />);
    });

    expect(mockRegisterVitals).toHaveBeenCalledTimes(1);
  });

  it("renders nothing (returns null)", async () => {
    mockRegisterVitals.mockResolvedValue(undefined);

    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(<WebVitalsReporter />));
    });

    expect(container.firstChild).toBeNull();
  });

  it("swallows a rejected registerVitals promise without throwing", async () => {
    mockRegisterVitals.mockRejectedValue(new Error("vitals load failed"));

    await expect(
      act(async () => {
        render(<WebVitalsReporter />);
      }),
    ).resolves.not.toThrow();
  });

  it("does not log to console.error in production when registerVitals rejects", async () => {
    const originalEnv = process.env.NODE_ENV;
    (process.env as Record<string, string>).NODE_ENV = "production";

    mockRegisterVitals.mockRejectedValue(new Error("vitals load failed"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await act(async () => {
      render(<WebVitalsReporter />);
    });

    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
    (process.env as Record<string, string>).NODE_ENV = originalEnv;
  });

  it("logs to console.error in development when registerVitals rejects", async () => {
    const originalEnv = process.env.NODE_ENV;
    (process.env as Record<string, string>).NODE_ENV = "development";

    const rejection = new Error("vitals load failed");
    mockRegisterVitals.mockRejectedValue(rejection);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await act(async () => {
      render(<WebVitalsReporter />);
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      "[WebVitalsReporter] Failed to register vitals:",
      rejection,
    );

    consoleSpy.mockRestore();
    (process.env as Record<string, string>).NODE_ENV = originalEnv;
  });
});
