import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';

const API_AUTH = '/api/auth';
const API_LEADS = '/api/leads';

const adminEmail = `role.admin.${Date.now()}@example.com`;
const counsellorEmail = `role.counsellor.${Date.now()}@example.com`;

const ADMIN = { full_name: 'Role Admin', email: adminEmail, password: 'Admin@1234', role: 'ADMIN' };
const COUNSELLOR = { full_name: 'Role Counsellor', email: counsellorEmail, password: 'Counsellor@1234', role: 'COUNSELLOR' };

let adminToken;
let counsellorToken;

test.before(async () => {
  await request(app).post(`${API_AUTH}/register`).send(ADMIN).expect(201);
  const a = await request(app).post(`${API_AUTH}/login`).send({ email: ADMIN.email, password: ADMIN.password }).expect(200);
  adminToken = a.body.data.accessToken;

  await request(app).post(`${API_AUTH}/register`).send(COUNSELLOR).expect(201);
  const c = await request(app).post(`${API_AUTH}/login`).send({ email: COUNSELLOR.email, password: COUNSELLOR.password }).expect(200);
  counsellorToken = c.body.data.accessToken;
});

test('COUNSELLOR cannot create lead (ADMIN only)', async () => {
  const payload = { full_name: 'Forbidden Lead', mobile: `9${Math.floor(100000000 + Math.random() * 900000000)}` };

  await request(app)
    .post(API_LEADS)
    .set('Authorization', `Bearer ${counsellorToken}`)
    .send(payload)
    .expect(403);
});

test('ADMIN can create lead', async () => {
  const payload = { full_name: 'Allowed Lead', mobile: `9${Math.floor(100000000 + Math.random() * 900000000)}` };

  const res = await request(app)
    .post(API_LEADS)
    .set('Authorization', `Bearer ${adminToken}`)
    .send(payload)
    .expect(201);

  assert.equal(res.body.success, true);
  assert.ok(res.body.data.id);
});
