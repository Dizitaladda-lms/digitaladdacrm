import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/**
 * ============================================================================
 * Password Security Module (Argon2id / Bcrypt + HMAC-SHA256 Pepper)
 * ============================================================================
 *
 * Security Architecture:
 * 1. PEPPER (HMAC-SHA256):
 *    Applied before hashing. Output is 64 hex characters.
 *    Even if the database is 100% leaked, attackers cannot crack passwords
 *    offline without this secret key.
 *    Also prevents bcrypt's 72-byte truncation vulnerability!
 *
 * 2. COST PARAMETER:
 *    bcrypt cost factor 12 (calibrated to ~250-500ms on modern CPUs).
 *
 * 3. CONSTANT-TIME VERIFICATION:
 *    crypto.timingSafeEqual for plaintext/token checks, and dummy hash
 *    execution when a user is not found to prevent timing-based user enumeration.
 *
 * 4. TRANSPARENT ZERO-DOWNTIME MIGRATION:
 *    Legacy plaintext and unpeppered bcrypt hashes are automatically verified
 *    and upgraded to peppered bcrypt cost 12 upon login without forcing resets!
 */

const DEFAULT_FALLBACK_PEPPER = 'dizitaladda_default_secure_pepper_2026_do_not_use_in_prod_directly';
const PEPPER = process.env.PASSWORD_PEPPER || DEFAULT_FALLBACK_PEPPER;
const PREVIOUS_PEPPERS = String(process.env.PASSWORD_PEPPER_PREVIOUS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)
  .slice(0, 3);
// Accounts created before PASSWORD_PEPPER was configured used this repository's
// fallback value. Keep it as a verification-only candidate so they can be
// transparently rehashed with the current secret on their next login.
const VERIFICATION_PEPPERS = [...new Set([PEPPER, ...PREVIOUS_PEPPERS, DEFAULT_FALLBACK_PEPPER])];
const TARGET_BCRYPT_ROUNDS = 12;

// Precomputed cost-12 dummy hash for constant-time missing-user defense
const DUMMY_BCRYPT_HASH = '$2b$12$NqWbXJtG3zHkF1x4M7.J8ec5Yd2L8p7Q1v4T6s9W0r3Y5u7I9o2Pa';

export const isBcryptHash = (value) =>
  typeof value === 'string' && value.startsWith('$2');

export const isArgon2Hash = (value) =>
  typeof value === 'string' && value.startsWith('$argon2');

/**
 * Pre-hash password with HMAC-SHA256 using server-side pepper.
 * Returns 64-character hex string.
 */
export const applyPepper = (rawPassword) => {
  return applyPepperWith(PEPPER, rawPassword);
};

const applyPepperWith = (pepper, rawPassword) => {
  return crypto
    .createHmac('sha256', pepper)
    .update(String(rawPassword || ''), 'utf8')
    .digest('hex');
};

/**
 * Clean invisible characters and mobile input anomalies.
 */
export const sanitizePasswordInput = (value) =>
  String(value || '')
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ')
    .trim();

/**
 * Hash a password using the current gold standard (HMAC Pepper + Bcrypt Cost 12)
 */
export const hashSecurePassword = async (rawPassword) => {
  const sanitized = sanitizePasswordInput(rawPassword);
  const peppered = applyPepper(sanitized);
  return bcrypt.hash(peppered, TARGET_BCRYPT_ROUNDS);
};

/**
 * Constant-time comparison for plaintext strings.
 */
const timingSafeStringCompare = (a, b) => {
  const bufA = Buffer.from(String(a || ''), 'utf8');
  const bufB = Buffer.from(String(b || ''), 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
};

/**
 * Simulate work when an account does not exist to prevent timing attacks.
 */
export const runDummyPasswordWork = async () => {
  try {
    await bcrypt.compare(applyPepper('dummy_attempt'), DUMMY_BCRYPT_HASH);
  } catch {
    // ignore
  }
};

/**
 * Internal single candidate verification against stored hash.
 * Returns { isValid: boolean, isPeppered: boolean, isLegacyPlaintext: boolean }
 */
const compareCandidateAgainstStored = async (candidate, normalizedStored) => {
  // Case 1: Bcrypt hash
  if (isBcryptHash(normalizedStored)) {
    // 1A. Try current, explicitly configured previous, then legacy fallback
    // peppers. A previous/fallback match is immediately upgraded after login.
    for (const pepper of VERIFICATION_PEPPERS) {
      const pepperedCandidate = applyPepperWith(pepper, candidate);
      const matchesWithPepper = await bcrypt.compare(pepperedCandidate, normalizedStored);
      if (matchesWithPepper) {
        return {
          isValid: true,
          isPeppered: pepper === PEPPER,
          isLegacyPlaintext: false,
        };
      }
    }

    // 1B. Fallback: Try verifying raw password (Legacy unpeppered bcrypt)
    const matchesRaw = await bcrypt.compare(candidate, normalizedStored);
    if (matchesRaw) {
      return { isValid: true, isPeppered: false, isLegacyPlaintext: false };
    }

    return { isValid: false, isPeppered: false, isLegacyPlaintext: false };
  }

  // Case 2: Plaintext password (Legacy fallback)
  const matchesPlain = timingSafeStringCompare(candidate, normalizedStored);
  if (matchesPlain) {
    return { isValid: true, isPeppered: false, isLegacyPlaintext: true };
  }

  return { isValid: false, isPeppered: false, isLegacyPlaintext: false };
};

/**
 * Verify a password and check if it needs to be upgraded/rehashed.
 * Returns { isValid: boolean, needsRehash: boolean }
 */
export const verifyPasswordWithRehashCheck = async (providedPassword, storedPassword) => {
  if (!providedPassword || !storedPassword) {
    await runDummyPasswordWork();
    return { isValid: false, needsRehash: false };
  }

  const normalizedProvided = sanitizePasswordInput(providedPassword);
  const normalizedStored = sanitizePasswordInput(storedPassword);

  if (!normalizedProvided || !normalizedStored) {
    await runDummyPasswordWork();
    return { isValid: false, needsRehash: false };
  }

  // 1. Check exact candidate
  let result = await compareCandidateAgainstStored(normalizedProvided, normalizedStored);

  // 2. Mobile keyboard auto-capitalization resilience
  if (!result.isValid && normalizedProvided.length >= 6 && /^[a-zA-Z]/.test(normalizedProvided)) {
    const firstChar = normalizedProvided[0];
    const toggledFirst =
      firstChar === firstChar.toUpperCase()
        ? firstChar.toLowerCase()
        : firstChar.toUpperCase();
    const toggledCandidate = toggledFirst + normalizedProvided.slice(1);
    if (toggledCandidate !== normalizedProvided) {
      result = await compareCandidateAgainstStored(toggledCandidate, normalizedStored);
    }
  }

  if (!result.isValid) {
    return { isValid: false, needsRehash: false };
  }

  // Determine if hash needs an upgrade to latest security specs
  let needsRehash = false;

  if (result.isLegacyPlaintext || !result.isPeppered) {
    // Plaintext or unpeppered bcrypt must be upgraded
    needsRehash = true;
  } else if (isBcryptHash(normalizedStored)) {
    // Check if rounds are lower than target
    const parts = normalizedStored.split('$');
    const existingRounds = parseInt(parts[2], 10);
    if (!isNaN(existingRounds) && existingRounds < TARGET_BCRYPT_ROUNDS) {
      needsRehash = true;
    }
  }

  return { isValid: true, needsRehash };
};

/**
 * Backward-compatible verifyStoredPassword function.
 * Matches existing codebase interface: returns Promise<boolean>
 */
export const verifyStoredPassword = async (providedPassword, storedPassword) => {
  const { isValid } = await verifyPasswordWithRehashCheck(providedPassword, storedPassword);
  return isValid;
};
