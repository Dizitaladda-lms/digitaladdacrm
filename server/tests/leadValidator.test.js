import test from 'node:test';
import request from 'supertest';
import assert from 'node:assert/strict';
import app from '../app.js';

const API_AUTH = '/api/auth';
const API_LEADS = '/api/leads';

const adminEmail = `val.admin.${Date.now()}@example.com`;
const ADMIN = { full_name: 'Val Admin', email: adminEmail, password: 'Admin@1234', role: 'ADMIN' };
let adminToken;

test.before(async () => {
  await request(app).post(`${API_AUTH}/register`).send(ADMIN).expect(201);
  const a = await request(app).post(`${API_AUTH}/login`).send({ email: ADMIN.email, password: ADMIN.password }).expect(200);
  adminToken = a.body.data.accessToken;
});

test('POST /api/leads validation: invalid mobile and platform', async () => {
  const payload = { full_name: 'Invalid Lead', mobile: '123', platform: 'UNKNOWN' };

  const res = await request(app)
    .post(API_LEADS)
    .set('Authorization', `Bearer ${adminToken}`)
    .send(payload)
    .expect(400);

  // message comes from the first validator that fails
});
