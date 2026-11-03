import { test as baseTest, beforeAll } from "vitest";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../app.js";
import pool from "../config/db.js";
import { isTestDatabase } from "./helpers/testDb.js";

const API_PREFIX = "/api/auth";
const TEST_DEVICE_ID = "a3bb189e-8bf9-4f26-9e4b-9f4e7fcd8123";
const runIntegrationTest = isTestDatabase();
const test = baseTest.skipIf(!runIntegrationTest);
const randomEmail = `test.${Date.now()}@example.com`;
const TEST_USER = {
  full_name: "Test User",
  email: randomEmail,
  password: "IntegrationPassphrase2026!",
  role: "ADMIN",
};

let authCookies = [];
let accessCookie;
let refreshCookie;

const getAuthCookies = (setCookies = []) =>
  setCookies
    .filter((cookie) => /^(?:accessToken|refreshToken)=/.test(cookie))
    .map((cookie) => cookie.split(";")[0]);

beforeAll(async () => {
  if (!runIntegrationTest) return;

  const response = await request(app)
    .post(`${API_PREFIX}/register`)
    .send(TEST_USER)
    .expect(201);

  assert.equal(response.body.success, true);
  assert.equal(response.body.statusCode, 201);
  assert.equal(response.body.data.email, TEST_USER.email);

  await pool.query("UPDATE users SET role = 'ADMIN' WHERE email = $1", [TEST_USER.email]);
});

test("POST /auth/login returns user data and HttpOnly cookies only", async () => {
  const loginResponse = await request(app)
    .post(`${API_PREFIX}/login`)
    .set("X-Device-Id", TEST_DEVICE_ID)
    .send({
      email: TEST_USER.email,
      password: TEST_USER.password,
    })
    .expect(200);

  assert.equal(loginResponse.body.success, true);
  assert.equal(loginResponse.body.statusCode, 200);
  assert.equal(loginResponse.body.data.accessToken, undefined);
  assert.equal(loginResponse.body.data.refreshToken, undefined);
  assert.ok(loginResponse.body.data.user);
  assert.equal(loginResponse.body.data.user.email, TEST_USER.email);

  authCookies = getAuthCookies(loginResponse.headers["set-cookie"]);
  accessCookie = authCookies.find((cookie) => cookie.startsWith("accessToken="));
  refreshCookie = authCookies.find((cookie) => cookie.startsWith("refreshToken="));
  assert.ok(accessCookie);
  assert.ok(refreshCookie);
});

test("GET /auth/me restores the logged-in user from the access cookie", async () => {
  assert.ok(accessCookie, "Access cookie must be available");

  const profileResponse = await request(app)
    .get(`${API_PREFIX}/me`)
    .set("X-Device-Id", TEST_DEVICE_ID)
    .set("Cookie", [accessCookie])
    .expect(200);

  assert.equal(profileResponse.body.success, true);
  assert.equal(profileResponse.body.statusCode, 200);
  assert.equal(profileResponse.body.data.email, TEST_USER.email);
});

test("POST /auth/refresh-token rotates cookies without returning tokens", async () => {
  assert.ok(refreshCookie, "Refresh cookie must be available");
  await new Promise((resolve) => setTimeout(resolve, 100));

  const previousRefreshCookie = refreshCookie;
  const refreshResponse = await request(app)
    .post(`${API_PREFIX}/refresh-token`)
    .set("X-Device-Id", TEST_DEVICE_ID)
    .set("Cookie", authCookies)
    .expect(200);

  assert.equal(refreshResponse.body.success, true);
  assert.equal(refreshResponse.body.statusCode, 200);
  assert.equal(refreshResponse.body.data.accessToken, undefined);
  assert.equal(refreshResponse.body.data.refreshToken, undefined);

  authCookies = getAuthCookies(refreshResponse.headers["set-cookie"]);
  accessCookie = authCookies.find((cookie) => cookie.startsWith("accessToken="));
  refreshCookie = authCookies.find((cookie) => cookie.startsWith("refreshToken="));
  assert.ok(accessCookie);
  assert.ok(refreshCookie);
  assert.notEqual(refreshCookie, previousRefreshCookie);
});

test("POST /auth/logout revokes the refresh cookie and clears auth cookies", async () => {
  assert.ok(refreshCookie, "Refresh cookie must be available");
  const previousRefreshCookie = refreshCookie;

  const logoutResponse = await request(app)
    .post(`${API_PREFIX}/logout`)
    .set("X-Device-Id", TEST_DEVICE_ID)
    .set("Cookie", authCookies)
    .expect(200);

  assert.equal(logoutResponse.body.success, true);
  assert.ok(
    logoutResponse.headers["set-cookie"].some((cookie) =>
      /^refreshToken=;/.test(cookie)
    )
  );

  await request(app)
    .post(`${API_PREFIX}/refresh-token`)
    .set("X-Device-Id", TEST_DEVICE_ID)
    .set("Cookie", [previousRefreshCookie])
    .expect(401);
});

test("GET /api/dashboard/overview accepts the HttpOnly access cookie", async () => {
  assert.ok(accessCookie, "Access cookie must be available");

  const overviewResponse = await request(app)
    .get("/api/dashboard/overview")
    .set("X-Device-Id", TEST_DEVICE_ID)
    .set("Cookie", [accessCookie])
    .expect(200);

  assert.equal(overviewResponse.body.success, true);
  assert.equal(overviewResponse.body.statusCode, 200);
  assert.ok(overviewResponse.body.data);
  assert.ok(typeof overviewResponse.body.data.summary === "object");
});

test("GET /api/dashboard/lead-analytics accepts the HttpOnly access cookie", async () => {
  assert.ok(accessCookie, "Access cookie must be available");

  const analyticsResponse = await request(app)
    .get("/api/dashboard/lead-analytics")
    .set("X-Device-Id", TEST_DEVICE_ID)
    .set("Cookie", [accessCookie])
    .expect(200);

  assert.equal(analyticsResponse.body.success, true);
  assert.equal(analyticsResponse.body.statusCode, 200);
  assert.ok(analyticsResponse.body.data);
  assert.equal(typeof analyticsResponse.body.data, "object");
  assert.ok("total" in analyticsResponse.body.data);
});
