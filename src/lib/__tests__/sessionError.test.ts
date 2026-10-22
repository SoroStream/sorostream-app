import { describe, expect, it } from "vitest";
import {
  SessionExpiredWalletError,
  isSessionExpiredError,
  FRIENDLY_SESSION_EXPIRED_MESSAGE,
} from "../freighter";

describe("session expiry error helpers", () => {
  it("recognizes SessionExpiredWalletError instances", () => {
    expect(isSessionExpiredError(new SessionExpiredWalletError())).toBe(true);
  });

  it("detects XDR / session signatures in raw error messages", () => {
    expect(isSessionExpiredError(new Error("failed to parse XDR envelope"))).toBe(true);
    expect(isSessionExpiredError(new Error("wallet session has expired"))).toBe(true);
    expect(isSessionExpiredError(new Error("not connected to freighter"))).toBe(true);
    expect(isSessionExpiredError("request timed out")).toBe(true);
  });

  it("does not flag unrelated errors as session expiry", () => {
    expect(isSessionExpiredError(new Error("network mismatch"))).toBe(false);
    expect(isSessionExpiredError(new Error("insufficient balance"))).toBe(false);
    expect(isSessionExpiredError(null)).toBe(false);
  });

  it("exposes a friendly user-facing message", () => {
    expect(typeof FRIENDLY_SESSION_EXPIRED_MESSAGE).toBe("string");
    expect(FRIENDLY_SESSION_EXPIRED_MESSAGE.length).toBeGreaterThan(0);
  });
});
