import { test, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { verifyStoredPassword } from '../utils/passwordUtils.js';

test('verifies legacy plain-text passwords after trimming', async () => {
  expect(await verifyStoredPassword('dizitaladda123', 'dizitaladda123')).toBe(true);
  expect(await verifyStoredPassword('dizitaladda123', ' dizitaladda123 ')).toBe(true);
});

test('verifies bcrypt hashes', async () => {
  const bcryptHash = await bcrypt.hash('Admin@123', 10);
  expect(await verifyStoredPassword('Admin@123', bcryptHash)).toBe(true);
});
