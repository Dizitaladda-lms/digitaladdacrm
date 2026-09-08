import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../utils/jwt.js';

const USER_PAYLOAD = {
  id: 123,
  email: 'test@example.com',
  role: 'ADMIN',
};

test('generates and verifies access tokens', async () => {
  process.env.JWT_SECRET = 'test_access_secret';
  process.env.JWT_EXPIRES_IN = '1h';

  const token = generateAccessToken(USER_PAYLOAD);
  assert.equal(typeof token, 'string');

  const decoded = verifyAccessToken(token);
  assert.equal(decoded.id, USER_PAYLOAD.id);
  assert.equal(decoded.email, USER_PAYLOAD.email);
  assert.equal(decoded.role, USER_PAYLOAD.role);
});

test('generates and verifies refresh tokens', async () => {
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';

  const token = generateRefreshToken(USER_PAYLOAD);
  assert.equal(typeof token, 'string');

  const decoded = verifyRefreshToken(token);
  assert.equal(decoded.id, USER_PAYLOAD.id);
});
