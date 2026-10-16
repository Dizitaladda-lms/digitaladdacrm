import crypto from "crypto";

/**
 * ============================================================================
 * RFC 6238 TOTP (Two-Factor Authentication) Engine
 * ============================================================================
 *
 * Implements pure Node.js cryptographic TOTP with zero external dependencies:
 * - Generates high-entropy Base32 secret keys.
 * - Encrypts secrets in database using AES-256-GCM so DB leaks cannot expose seeds.
 * - Constant-time verification with a ±1 time step window (30-second steps).
 */

const FALLBACK_ENC_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || FALLBACK_ENC_KEY;

export const encryptTotpSecret = (plainSecret) => {
  const iv = crypto.randomBytes(12);
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), "hex");
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainSecret), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
};

export const decryptTotpSecret = (encryptedPayload) => {
  if (!encryptedPayload || !encryptedPayload.includes(":")) return "";
  const [ivHex, tagHex, dataHex] = encryptedPayload.split(":");
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return decipher.update(Buffer.from(dataHex, "hex"), undefined, "utf8") + decipher.final("utf8");
};

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export const generateBase32Secret = (byteLength = 20) => {
  const bytes = crypto.randomBytes(byteLength);
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
};

const base32Decode = (base32) => {
  let bits = 0;
  let value = 0;
  const output = [];

  for (const char of String(base32).toUpperCase().replace(/=+$/, "")) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
};

export const generateTotpForStep = (secretBase32, step) => {
  const key = base32Decode(secretBase32);
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64BE(BigInt(step));

  const hmac = crypto.createHmac("sha1", key).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (binary % 1000000).toString().padStart(6, "0");
};

export const verifyTotpCode = (secretBase32, candidateCode) => {
  if (!candidateCode || !/^\d{6}$/.test(String(candidateCode).trim())) {
    return false;
  }

  const cleanCode = String(candidateCode).trim();
  const epoch = Math.floor(Date.now() / 1000);
  const currentStep = Math.floor(epoch / 30);

  // Check current window and ±1 step (allows 30-second clock skew)
  for (let offset = -1; offset <= 1; offset++) {
    const expected = generateTotpForStep(secretBase32, currentStep + offset);
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(cleanCode))) {
      return true;
    }
  }

  return false;
};
