import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyAddress } from "../addressVerification";

vi.mock("@/src/lib/federation", () => ({
  resolveFederationName: vi.fn(() => new Promise(() => {})),
  LookupAbortedError: class LookupAbortedError extends Error {},
  isLookupAborted: () => false,
}));

describe("address verification timeout (issue #697)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("returns unverified when an underlying request never settles", async () => {
    const address = `G${"D".repeat(55)}`;
    const resultPromise = verifyAddress(address);

    await vi.advanceTimersByTimeAsync(10_000);
    const result = await resultPromise;

    expect(result.status).toBe("unverified");
    expect(result.error).toMatch(/timed out/i);
  });
});
