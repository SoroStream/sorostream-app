/**
 * TOTP (Time-based One-Time Password) implementation for 2FA
 * Compatible with RFC 6238 and standard authenticator apps.
 *
 * Enrollment needs more than a secret: authenticator apps read an
 * `otpauth://totp/...` provisioning URI (the format documented by Google
 * Authenticator's "Key Uri Format"), which is what a QR code encodes.
 * `buildOTPAuthURI` produces it from a secret, account label and issuer (#691);
 * `generateTOTPURI` is the older positional wrapper kept for existing callers.
 */

/** Base32 alphabet used by TOTP secrets — no padding characters. */
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Supported OTP hash algorithms, as spelled in otpauth URIs. */
export type OTPAlgorithm = "SHA1" | "SHA256" | "SHA512";

/** Conventional TOTP parameters used by authenticator apps by default. */
export const TOTP_DEFAULT_ALGORITHM: OTPAlgorithm = "SHA1";
export const TOTP_DEFAULT_DIGITS = 6;
export const TOTP_DEFAULT_PERIOD_SECONDS = 30;

/**
 * Generate a random base32 secret key
 */
export function generateSecret(): string {
  const secretLength = 32;
  let secret = "";
  
  for (let i = 0; i < secretLength; i++) {
    const randomBytes = new Uint8Array(1);
    crypto.getRandomValues(randomBytes);
    secret += BASE32_ALPHABET[randomBytes[0] % BASE32_ALPHABET.length];
  }
  
  return secret;
}

export interface OTPAuthURIOptions {
  /** Base32 secret from `generateSecret()`. Spaces, hyphens and padding are ignored. */
  secret: string;
  /** Account label shown in the authenticator app, e.g. an email or username. */
  accountName: string;
  /** Issuer/organisation shown in the app. Omitted from the URI when empty. */
  issuer?: string;
  /** Hash algorithm. Defaults to SHA1 (what authenticator apps assume). */
  algorithm?: OTPAlgorithm;
  /** Number of code digits. Defaults to 6. */
  digits?: number;
  /** Code rotation period in seconds. Defaults to 30. */
  period?: number;
}

/**
 * `encodeURIComponent` leaves `!'()*` untouched, but they are awkward inside an
 * otpauth label (several apps parse the label themselves). Encode them too.
 */
function encodeURIPart(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/**
 * Normalise a user-supplied Base32 secret: uppercase, drop whitespace,
 * hyphens and `=` padding.
 *
 * @throws {TypeError} When the remaining string isn't valid Base32.
 */
export function normalizeBase32Secret(secret: string): string {
  const normalized = secret.replace(/[\s-]/g, "").replace(/=+$/, "").toUpperCase();
  if (normalized.length === 0) {
    throw new TypeError("A TOTP secret is required to build a provisioning URI.");
  }
  if (!new RegExp(`^[${BASE32_ALPHABET}]+$`).test(normalized)) {
    throw new TypeError("TOTP secret must be Base32 (A-Z and 2-7).");
  }
  return normalized;
}

/**
 * Build a standard `otpauth://totp/...` provisioning URI for authenticator-app
 * enrollment (#691) — the string a QR code encodes.
 *
 * The label is `issuer:account`, with both halves URI-encoded and the colon
 * separator left literal; `issuer` is repeated as a query parameter because
 * authenticator apps only agree on the label prefix when both match. The
 * secret is emitted as unpadded uppercase Base32, and `algorithm`, `digits`
 * and `period` are always explicit so no app has to guess.
 *
 * @example
 * buildOTPAuthURI({
 *   secret: generateSecret(),
 *   accountName: "user@example.com",
 *   issuer: "SoroStream",
 * });
 * // => otpauth://totp/SoroStream:user%40example.com
 * //    ?secret=JBSWY3DPEHPK3PXP&issuer=SoroStream&algorithm=SHA1&digits=6&period=30
 *
 * @throws {TypeError} When the secret is empty or not Base32.
 */
export function buildOTPAuthURI({
  secret,
  accountName,
  issuer = "SoroStream",
  algorithm = TOTP_DEFAULT_ALGORITHM,
  digits = TOTP_DEFAULT_DIGITS,
  period = TOTP_DEFAULT_PERIOD_SECONDS,
}: OTPAuthURIOptions): string {
  const normalizedSecret = normalizeBase32Secret(secret);
  const encodedAccount = encodeURIPart(accountName);
  const trimmedIssuer = issuer.trim();
  const encodedIssuer = encodeURIPart(trimmedIssuer);

  // Label: "issuer:account" (issuer half omitted when the issuer is blank).
  const label = trimmedIssuer ? `${encodedIssuer}:${encodedAccount}` : encodedAccount;

  const params: Array<[string, string]> = [["secret", normalizedSecret]];
  if (trimmedIssuer) params.push(["issuer", encodedIssuer]);
  params.push(
    ["algorithm", algorithm],
    ["digits", String(digits)],
    ["period", String(period)],
  );

  const query = params.map(([key, value]) => `${key}=${value}`).join("&");
  return `otpauth://totp/${label}?${query}`;
}

/**
 * Generate TOTP URI for QR code.
 *
 * Positional wrapper around `buildOTPAuthURI` kept for existing callers.
 */
export function generateTOTPURI(
  secret: string,
  accountName: string,
  issuer: string = "SoroStream"
): string {
  return buildOTPAuthURI({ secret, accountName, issuer });
}

/**
 * Generate recovery codes (8 single-use codes)
 */
export function generateRecoveryCodes(): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < 8; i++) {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    const code = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    codes.push(code);
  }
  
  return codes;
}

/**
 * Validate TOTP code (simplified - in production, use a proper TOTP library)
 * This is a placeholder for demonstration. In production, use a library like 'otpauth'
 */
export function validateTOTP(
  secret: string,
  token: string,
  window: number = 1
): boolean {
  // Placeholder implementation
  // In production, this would:
  // 1. Get current time
  // 2. Calculate time steps
  // 3. Generate HMAC for each step in the window
  // 4. Compare with provided token
  
  // For now, just check format (6 digits)
  return /^\d{6}$/.test(token);
}

/**
 * Hash a secret for storage (never store raw secrets)
 */
export async function hashSecret(secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(secret);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verify recovery code format
 */
export function isValidRecoveryCode(code: string): boolean {
  return /^[A-F0-9]{8}$/.test(code);
}

/**
 * Format recovery code for display (add hyphens for readability)
 */
export function formatRecoveryCode(code: string): string {
  if (code.length === 8) {
    return `${code.slice(0, 4)}-${code.slice(4)}`;
  }
  return code;
}
