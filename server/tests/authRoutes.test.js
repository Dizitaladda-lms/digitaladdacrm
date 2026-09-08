import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';

const API_PREFIX = '/api/auth';
const randomEmail = `test.${Date.now()}@example.com`;
const TEST_USER = {
  full_name: 'Test User',
  email: randomEmail,
  password: 'Admin@1234',
  role: 'ADMIN',
};

let loginResponse;
let accessToken;
let refreshToken;

test.before(async () => {
  const response = await request(app)
    .post(`${API_PREFIX}/register`)
    .send(TEST_USER)
    .expect(201);

  assert.equal(response.body.success, true);
  assert.equal(response.body.statusCode, 201);
  assert.equal(response.body.data.email, TEST_USER.email);
});

test('POST /auth/login returns tokens for valid credentials', async () => {
  loginResponse = await request(app)
    .post(`${API_PREFIX}/login`)
    .send({
      email: TEST_USER.email,
      password: TEST_USER.password,
    })
    .expect(200);

  accessToken = loginResponse.body.data.accessToken;
  refreshToken = loginResponse.body.data.refreshToken;

  assert.equal(loginResponse.body.success, true);
  assert.equal(loginResponse.body.statusCode, 200);
  assert.ok(accessToken);
  assert.ok(refreshToken);
  assert.ok(loginResponse.body.data.user);
  assert.equal(loginResponse.body.data.user.email, TEST_USER.email);
});

test('GET /auth/me returns the logged in user profile', async () => {
  assert.ok(accessToken, 'Access token must be available');

  const profileResponse = await request(app)
    .get(`${API_PREFIX}/me`)
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);

  assert.equal(profileResponse.body.success, true);
  assert.equal(profileResponse.body.statusCode, 200);
  assert.equal(profileResponse.body.data.email, TEST_USER.email);
});

test('POST /auth/refresh-token returns new access and refresh tokens', async () => {
  assert.ok(refreshToken, 'Refresh token must be available');

  // Small delay so token iat timestamp increments
  await new Promise((r) => setTimeout(r, 1100));

  const refreshResponse = await request(app)
    .post(`${API_PREFIX}/refresh-token`)
    .send({ refreshToken })
    .expect(200);

  assert.equal(refreshResponse.body.success, true);
  assert.equal(refreshResponse.body.statusCode, 200);
  assert.ok(refreshResponse.body.data.accessToken);
  assert.ok(refreshResponse.body.data.refreshToken);
  assert.notEqual(
    refreshResponse.body.data.accessToken,
    accessToken
  );

  accessToken = refreshResponse.body.data.accessToken;
  refreshToken = refreshResponse.body.data.refreshToken;
});

test('POST /auth/logout revokes refresh token and prevents refresh', async () => {
  assert.ok(refreshToken, 'Refresh token must be available');
  assert.ok(accessToken, 'Access token must be available');

  const logoutResponse = await request(app)
    .post(`${API_PREFIX}/logout`)
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);

  assert.equal(logoutResponse.body.success, true);

  await request(app)
    .post(`${API_PREFIX}/refresh-token`)
    .send({ refreshToken })
    .expect(401);
});

test('GET /api/dashboard/overview is protected and returns dashboard data', async () => {
  assert.ok(accessToken, 'Access token must be available');

  const overviewResponse = await request(app)
    .get('/api/dashboard/overview')
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);

  assert.equal(overviewResponse.body.success, true);
  assert.equal(overviewResponse.body.statusCode, 200);
  assert.ok(overviewResponse.body.data);
  assert.ok(typeof overviewResponse.body.data.summary === 'object');
});

test('GET /api/dashboard/lead-analytics is protected and returns analytics data', async () => {
  assert.ok(accessToken, 'Access token must be available');

  const analyticsResponse = await request(app)
    .get('/api/dashboard/lead-analytics')
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);

  assert.equal(analyticsResponse.body.success, true);
  assert.equal(analyticsResponse.body.statusCode, 200);
  assert.ok(analyticsResponse.body.data);
  assert.equal(typeof analyticsResponse.body.data, 'object');
  assert.ok('total' in analyticsResponse.body.data);
});