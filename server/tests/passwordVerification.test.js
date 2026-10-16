import { test, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import {
  verifyStoredPassword,
  verifyPasswordWithRehashCheck,
  hashSecurePassword,
  applyPepper,
} from '../utils/passwordUtils.js';
import { validatePasswordPolicy } from '../utils/passwordPolicy.js';
import {
  generateBase32Secret,
  generateTotpForStep,
  verifyTotpCode,
  encryptTotpSecret,
  decryptTotpSecret,
} from '../utils/totpSecurity.js';

test('verifies legacy plain-text passwords after trimming and signals needsRehash', async () => {
  expect(await verifyStoredPassword('dizitaladda123', 'dizitaladda123')).toBe(true);
  expect(await verifyStoredPassword('dizitaladda123', ' dizitaladda123 ')).toBe(true);

  const check = await verifyPasswordWithRehashCheck('dizitaladda123', 'dizitaladda123');
  expect(check.isValid).toBe(true);
  expect(check.needsRehash).toBe(true);
});

test('verifies legacy unpeppered bcrypt hashes and signals needsRehash', async () => {
  const bcryptHash = await bcrypt.hash('Admin@123', 10);
  expect(await verifyStoredPassword('Admin@123', bcryptHash)).toBe(true);

  const check = await verifyPasswordWithRehashCheck('Admin@123', bcryptHash);
  expect(check.isValid).toBe(true);
  expect(check.needsRehash).toBe(true);
});

test('hashes with HMAC-SHA256 pepper and cost 12, verifies and requires no rehash', async () => {
  const secureHash = await hashSecurePassword('SuperSecurePassword2026!');
  expect(secureHash.startsWith('$2b$12$')).toBe(true);

  const check = await verifyPasswordWithRehashCheck('SuperSecurePassword2026!', secureHash);
  expect(check.isValid).toBe(true);
  expect(check.needsRehash).toBe(false);

  const wrongCheck = await verifyPasswordWithRehashCheck('WrongPassword123!', secureHash);
  expect(wrongCheck.isValid).toBe(false);
});

test('password policy enforces minimum 12 chars and maximum 128 chars', async () => {
  const shortRes = await validatePasswordPolicy('short123');
  expect(shortRes.valid).toBe(false);
  expect(shortRes.message).toContain('at least 12 characters');

  const validRes = await validatePasswordPolicy('MyVeryLongSecurePassphrase2026');
  expect(validRes.valid).toBe(true);
});

test('generates, encrypts, and validates 2FA TOTP codes', () => {
  const secret = generateBase32Secret();
  expect(secret.length).toBeGreaterThanOrEqual(16);

  const encrypted = encryptTotpSecret(secret);
  expect(encrypted).toContain(':');
  expect(decryptTotpSecret(encrypted)).toBe(secret);

  const currentStep = Math.floor(Date.now() / 1000 / 30);
  const validCode = generateTotpForStep(secret, currentStep);
  expect(verifyTotpCode(secret, validCode)).toBe(true);

  expect(verifyTotpCode(secret, '000000')).toBe(false);
});

