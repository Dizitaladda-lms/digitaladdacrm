import crypto from "crypto";

/**
 * NIST SP 800-63B Compliant Password Policy Validator
 *
 * Requirements:
 * 1. Minimum length: 12 characters.
 * 2. Maximum length: 128 characters (prevents DoS / memory exhaustion).
 * 3. No forced complexity rules (no mandatory special characters, uppercase, or numbers) -
 *    NIST SP 800-63B states arbitrary composition rules encourage predictable patterns.
 * 4. Checks against known breached passwords via HaveIBeenPwned k-Anonymity API:
 *    Only the first 5 characters of the SHA-1 hash are transmitted over the network.
 *    The full password or full hash is NEVER exposed.
 */

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;

/**
 * Checks HaveIBeenPwned k-Anonymity API.
 * Returns true if breached, false if clean or if check fails.
 */
export const isPasswordBreached = async (rawPassword) => {
  if (!rawPassword || typeof rawPassword !== "string") return false;

  const sha1 = crypto
    .createHash("sha1")
    .update(rawPassword, "utf8")
    .digest("hex")
    .toUpperCase();

  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5s timeout

  try {
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      method: "GET",
      headers: {
        "Add-Padding": "true", // Prevents side-channel size leakage
        "User-Agent": "DizitalAdda-CRM-SecurityValidator",
      },
      signal: controller.signal,
    });

    if (!response.ok) return false;

    const body = await response.text();
    const lines = body.split("\r\n");

    for (const line of lines) {
      const [hashSuffix] = line.split(":");
      if (hashSuffix && hashSuffix.trim() === suffix) {
        return true; // Match found: Password exists in public breaches!
      }
    }

    return false;
  } catch (error) {
    // Fail open: network timeout or connectivity loss should not block users
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Validate password against NIST policy and breach database.
 * Returns { valid: boolean, message?: string }
 */
export const validatePasswordPolicy = async (rawPassword) => {
  if (typeof rawPassword !== "string") {
    return { valid: false, message: "Password must be a valid string." };
  }

  const clean = rawPassword.trim();

  if (clean.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
    };
  }

  if (clean.length > MAX_PASSWORD_LENGTH) {
    return {
      valid: false,
      message: `Password must not exceed ${MAX_PASSWORD_LENGTH} characters.`,
    };
  }

  // Check breach status via k-anonymity
  const breached = await isPasswordBreached(clean);
  if (breached) {
    return {
      valid: false,
      message:
        "This password has appeared in a known public data breach. Please choose a different, unique password.",
    };
  }

  return { valid: true };
};
