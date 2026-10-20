/**
 * Tests for the otpauth:// provisioning URI builder (#691).
 */
import { describe, it, expect } from "vitest";
import {
  buildOTPAuthURI,
  generateSecret,
  generateTOTPURI,
  normalizeBase32Secret,
} from "../totp";

const SECRET = "JBSWY3DPEHPK3PXP";

describe("buildOTPAuthURI — standard shape", () => {
  it("builds the documented otpauth URI for a plain account", () => {
    expect(
      buildOTPAuthURI({
        secret: SECRET,
        accountName: "user@example.com",
        issuer: "SoroStream",
      }),
    ).toBe(
      "otpauth://totp/SoroStream:user%40example.com" +
        `?secret=${SECRET}&issuer=SoroStream&algorithm=SHA1&digits=6&period=30`,
    );
  });

  it("keeps the literal colon between issuer and account in the label", () => {
    const uri = buildOTPAuthURI({ secret: SECRET, accountName: "alice", issuer: "SoroStream" });
    expect(uri.split("?")[0]).toBe("otpauth://totp/SoroStream:alice");
  });

  it("round-trips through URL parsing", () => {
    const url = new URL(
      buildOTPAuthURI({ secret: SECRET, accountName: "user+2fa@example.com", issuer: "SoroStream" }),
    );

    expect(url.protocol).toBe("otpauth:");
    expect(url.hostname).toBe("totp");
    expect(decodeURIComponent(url.pathname)).toBe("/SoroStream:user+2fa@example.com");
    expect(url.searchParams.get("secret")).toBe(SECRET);
    expect(url.searchParams.get("issuer")).toBe("SoroStream");
    expect(url.searchParams.get("algorithm")).toBe("SHA1");
    expect(url.searchParams.get("digits")).toBe("6");
    expect(url.searchParams.get("period")).toBe("30");
  });

  it("omits the issuer prefix and parameter when no issuer is given", () => {
    const uri = buildOTPAuthURI({ secret: SECRET, accountName: "alice", issuer: "" });
    expect(uri).toContain("otpauth://totp/alice?");
    expect(uri).not.toContain("issuer=");
  });

  it("reflects non-default algorithm, digits and period", () => {
    const url = new URL(
      buildOTPAuthURI({
        secret: SECRET,
        accountName: "alice",
        issuer: "SoroStream",
        algorithm: "SHA256",
        digits: 8,
        period: 60,
      }),
    );
    expect(url.searchParams.get("algorithm")).toBe("SHA256");
    expect(url.searchParams.get("digits")).toBe("8");
    expect(url.searchParams.get("period")).toBe("60");
  });
});

describe("buildOTPAuthURI — encoding", () => {
  it("percent-encodes special characters in the account label", () => {
    const uri = buildOTPAuthURI({
      secret: SECRET,
      accountName: "jane doe+2fa@example.com",
      issuer: "SoroStream",
    });

    expect(uri).toContain("/SoroStream:jane%20doe%2B2fa%40example.com?");
    // Spaces must be %20, never "+", which many authenticator apps would keep
    // literally in the account name.
    expect(uri).not.toContain("doe+2fa");
  });

  it("encodes colons inside the account label so the separator stays unambiguous", () => {
    const uri = buildOTPAuthURI({ secret: SECRET, accountName: "team:alice", issuer: "SoroStream" });
    const label = uri.slice("otpauth://totp/".length, uri.indexOf("?"));

    expect(label).toBe("SoroStream:team%3Aalice");
    expect(label.split(":").length).toBe(2); // exactly one literal separator
    expect(decodeURIComponent(label.split(":")[1])).toBe("team:alice");
  });

  it("encodes reserved characters that encodeURIComponent leaves alone", () => {
    const uri = buildOTPAuthURI({
      secret: SECRET,
      accountName: "o'brien (work)*!",
      issuer: "SoroStream",
    });
    const label = decodeURIComponent(uri.slice("otpauth://totp/".length, uri.indexOf("?")));

    expect(uri).toContain("o%27brien%20%28work%29%2A%21");
    expect(label).toBe("SoroStream:o'brien (work)*!");
  });

  it("encodes the issuer in both the label and the query parameter", () => {
    const url = new URL(
      buildOTPAuthURI({ secret: SECRET, accountName: "alice", issuer: "Soro Stream & Co" }),
    );

    expect(url.pathname).toBe("/Soro%20Stream%20%26%20Co:alice");
    expect(url.searchParams.get("issuer")).toBe("Soro Stream & Co");
    expect(url.searchParams.get("secret")).toBe(SECRET);
  });

  it("handles unicode account labels", () => {
    const url = new URL(
      buildOTPAuthURI({ secret: SECRET, accountName: "josé@exämple.com", issuer: "SoroStream" }),
    );
    expect(decodeURIComponent(url.pathname)).toBe("/SoroStream:josé@exämple.com");
  });
});

describe("buildOTPAuthURI — secret normalisation", () => {
  it("uppercases and strips spaces, hyphens and padding", () => {
    expect(normalizeBase32Secret(" jbsw y3dp-ehpk 3pxp== ")).toBe(SECRET);
    expect(
      buildOTPAuthURI({ secret: "jbsw y3dp ehpk 3pxp", accountName: "alice" }),
    ).toContain(`secret=${SECRET}`);
  });

  it("rejects empty or non-Base32 secrets", () => {
    expect(() => normalizeBase32Secret("")).toThrow(TypeError);
    expect(() => normalizeBase32Secret("   ")).toThrow(/required/i);
    expect(() => normalizeBase32Secret("JBSW0Y3DP")).toThrow(/Base32/); // 0 is not in the alphabet
    expect(() => buildOTPAuthURI({ secret: "nope!", accountName: "alice" })).toThrow(TypeError);
  });
});

describe("generateTOTPURI (backwards-compatible wrapper)", () => {
  it("delegates to buildOTPAuthURI with the default SoroStream issuer", () => {
    expect(generateTOTPURI(SECRET, "user@example.com")).toBe(
      buildOTPAuthURI({ secret: SECRET, accountName: "user@example.com", issuer: "SoroStream" }),
    );
  });

  it("honours a custom issuer", () => {
    expect(generateTOTPURI(SECRET, "alice", "Acme")).toContain("otpauth://totp/Acme:alice?");
  });
});

describe("generateSecret", () => {
  it("returns 32 Base32 characters that can be provisioned", () => {
    const secret = generateSecret();

    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(normalizeBase32Secret(secret)).toBe(secret);
    expect(buildOTPAuthURI({ secret, accountName: "alice" })).toContain(`secret=${secret}`);
  });
});
