import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import ROLES from "../constants/roles.js";

// ASSUMPTION: app.js default-exports the Express app (not wrapped, not
// already listening). If your entrypoint exports it differently
// (named export, or app.listen() already called in this file), adjust
// this import — the rest of the tests don't depend on how it's exported.
import app from "../app.js";

import { resetAuthTables, createTestUser, closeTestPool } from "./helpers/testDb.js";

describe("Auth: login", () => {
  beforeEach(async () => {
    await resetAuthTables();
  });

  it("logs in with correct credentials and sets httpOnly cookies", async () => {
    const testUser = await createTestUser({
      email: "counsellor@test.com",
      role: ROLES.COUNSELLOR,
    });

    const res = await request(app).post("/api/auth/login").send({
      email: testUser.email,
      password: testUser.plaintextPassword,
    });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(testUser.email);
    // Password must never appear anywhere in the response body.
    expect(res.body.data.user.password).toBeUndefined();
    // Refresh token must be in cookies, never in the JSON body — this is the
    // whole point of the P0-1 migration.
    expect(res.body.data.refreshToken).toBeUndefined();

    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.startsWith("accessToken="))).toBe(true);
    expect(cookies.some((c) => c.startsWith("refreshToken="))).toBe(true);
    expect(cookies.some((c) => c.toLowerCase().includes("httponly"))).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const testUser = await createTestUser({
      email: "counsellor2@test.com",
      role: ROLES.COUNSELLOR,
    });

    const res = await request(app).post("/api/auth/login").send({
      email: testUser.email,
      password: "WrongPassword!",
    });

    expect(res.status).toBe(401);
  });

  it("rejects a nonexistent email without revealing that it doesn't exist", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "nobody@test.com",
      password: "whatever123",
    });

    expect(res.status).toBe(401);
    // Same generic message as a wrong password — must not leak whether
    // the email exists (this is already correct in loginUserService,
    // this test just locks it in).
    expect(res.body.message).toMatch(/invalid email or password/i);
  });
});

describe("Auth: protected routes", () => {
  beforeEach(async () => {
    await resetAuthTables();
  });

  it("rejects a request with no auth cookie at all", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("rejects a garbage/invalid cookie value", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", ["accessToken=not-a-real-jwt"]);
    expect(res.status).toBe(401);
  });

  it("allows access with a valid access token cookie", async () => {
    const testUser = await createTestUser({
      email: "counsellor3@test.com",
      role: ROLES.COUNSELLOR,
    });

    const loginRes = await request(app).post("/api/auth/login").send({
      email: testUser.email,
      password: testUser.plaintextPassword,
    });

    const cookies = loginRes.headers["set-cookie"];

    const meRes = await request(app).get("/api/auth/me").set("Cookie", cookies);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe(testUser.email);
  });
});

describe("Auth: refresh token rotation", () => {
  beforeEach(async () => {
    await resetAuthTables();
  });

  it("issues new cookies on refresh and invalidates the old refresh token", async () => {
    const testUser = await createTestUser({
      email: "counsellor4@test.com",
      role: ROLES.COUNSELLOR,
    });

    const loginRes = await request(app).post("/api/auth/login").send({
      email: testUser.email,
      password: testUser.plaintextPassword,
    });

    const loginCookies = loginRes.headers["set-cookie"];

    const refreshRes = await request(app)
      .post("/api/auth/refresh-token")
      .set("Cookie", loginCookies);

    expect(refreshRes.status).toBe(200);
    const refreshedCookies = refreshRes.headers["set-cookie"];
    expect(refreshedCookies).toBeDefined();

    // Reusing the OLD refresh token cookie must now fail — rotation means
    // each refresh token is single-use. This is the behavior
    // refreshTokenRotationService already implements (deletes the old
    // token row before issuing a new one); this test locks it in.
    const reuseRes = await request(app)
      .post("/api/auth/refresh-token")
      .set("Cookie", loginCookies);

    expect(reuseRes.status).toBe(401);
  });

  it("rejects a refresh attempt with no refresh cookie", async () => {
    const res = await request(app).post("/api/auth/refresh-token");
    expect(res.status).toBe(401);
  });
});

describe("Auth: logout", () => {
  beforeEach(async () => {
    await resetAuthTables();
  });

  it("clears cookies and invalidates the session", async () => {
    const testUser = await createTestUser({
      email: "counsellor5@test.com",
      role: ROLES.COUNSELLOR,
    });

    const loginRes = await request(app).post("/api/auth/login").send({
      email: testUser.email,
      password: testUser.plaintextPassword,
    });

    const loginCookies = loginRes.headers["set-cookie"];

    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", loginCookies);

    expect(logoutRes.status).toBe(200);

    // The refresh token used for logout should now be dead — matches
    // logoutUserService deleting the row.
    const refreshAfterLogout = await request(app)
      .post("/api/auth/refresh-token")
      .set("Cookie", loginCookies);

    expect(refreshAfterLogout.status).toBe(401);
  });
});

describe("Auth: role is reflected correctly on login", () => {
  beforeEach(async () => {
    await resetAuthTables();
  });

  it("returns ADMIN role for an admin user", async () => {
    const admin = await createTestUser({
      email: "admin@test.com",
      role: ROLES.ADMIN,
    });

    const res = await request(app).post("/api/auth/login").send({
      email: admin.email,
      password: admin.plaintextPassword,
    });

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe(ROLES.ADMIN);
  });
});

afterAll(async () => {
  await closeTestPool();
});
