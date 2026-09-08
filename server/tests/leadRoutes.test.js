import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';

const API_AUTH = '/api/auth';
const API_LEADS = '/api/leads';

const randomEmail = `lead.test.${Date.now()}@example.com`;
const ADMIN_USER = {
  full_name: 'Lead Admin',
  email: randomEmail,
  password: 'Admin@1234',
  role: 'ADMIN',
};

let accessToken;
let leadId;

test.before(async () => {
  const res = await request(app).post(`${API_AUTH}/register`).send(ADMIN_USER).expect(201);
  assert.equal(res.body.success, true);

  const login = await request(app).post(`${API_AUTH}/login`).send({ email: ADMIN_USER.email, password: ADMIN_USER.password }).expect(200);
  accessToken = login.body.data.accessToken;
  assert.ok(accessToken);
});

test('POST /api/leads (ADMIN) creates a lead', async () => {
  const payload = {
    full_name: 'Test Lead',
    mobile: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
    email: `lead.${Date.now()}@example.com`,
  };

  const res = await request(app)
    .post(API_LEADS)
    .set('Authorization', `Bearer ${accessToken}`)
    .send(payload)
    .expect(201);

  assert.equal(res.body.success, true);
  assert.equal(res.body.statusCode, 201);
  assert.ok(res.body.data.id);
  leadId = res.body.data.id;
});

test('GET /api/leads returns leads list', async () => {
  const res = await request(app)
    .get(API_LEADS)
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);

  assert.equal(res.body.success, true);
  assert.equal(res.body.statusCode, 200);
  assert.ok(Array.isArray(res.body.data) || Array.isArray(res.body.data.leads));
});

test('GET /api/leads/:id returns the lead', async () => {
  assert.ok(leadId);

  const res = await request(app)
    .get(`${API_LEADS}/${leadId}`)
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);

  assert.equal(res.body.success, true);
  assert.equal(res.body.statusCode, 200);
  assert.equal(res.body.data.id, leadId);
});

test('PUT /api/leads/:id updates the lead (ADMIN)', async () => {
  const res = await request(app)
    .put(`${API_LEADS}/${leadId}`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ full_name: 'Updated Lead' })
    .expect(200);

  assert.equal(res.body.success, true);
  assert.equal(res.body.statusCode, 200);
  assert.equal(res.body.data.full_name, 'Updated Lead');
});

test('DELETE /api/leads/:id deletes the lead (ADMIN)', async () => {
  const res = await request(app)
    .delete(`${API_LEADS}/${leadId}`)
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);

  assert.equal(res.body.success, true);
  assert.equal(res.body.statusCode, 200);
});
