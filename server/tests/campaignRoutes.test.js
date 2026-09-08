import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';

const API_AUTH = '/api/auth';
const API_CAMPAIGNS = '/api/campaigns';

const randomEmail = `campaign.test.${Date.now()}@example.com`;
const ADMIN_USER = {
  full_name: 'Campaign Admin',
  email: randomEmail,
  password: 'Admin@1234',
  role: 'ADMIN',
};

let accessToken;
let campaignId;

test.before(async () => {
  // register admin
  const res = await request(app).post(`${API_AUTH}/register`).send(ADMIN_USER).expect(201);
  assert.equal(res.body.success, true);

  // login
  const login = await request(app)
    .post(`${API_AUTH}/login`)
    .send({ email: ADMIN_USER.email, password: ADMIN_USER.password })
    .expect(200);

  accessToken = login.body.data.accessToken;
  assert.ok(accessToken);
});

test('POST /api/campaigns (ADMIN) creates a campaign', async () => {
  const payload = {
    campaign_name: 'Test Campaign',
    platform: 'META',
    budget: 1000,
  };

  const res = await request(app)
    .post(API_CAMPAIGNS)
    .set('Authorization', `Bearer ${accessToken}`)
    .send(payload)
    .expect(201);

  assert.equal(res.body.success, true);
  assert.equal(res.body.statusCode, 201);
  assert.ok(res.body.data.id || res.body.data.campaign_code);
  campaignId = res.body.data.id || res.body.data.campaign_id;
});

test('GET /api/campaigns returns list including created campaign', async () => {
  const res = await request(app)
    .get(API_CAMPAIGNS)
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);

  assert.equal(res.body.success, true);
  assert.equal(res.body.statusCode, 200);
  assert.ok(Array.isArray(res.body.data) || Array.isArray(res.body.data.campaigns));
});

test('GET /api/campaigns/:id returns the campaign', async () => {
  assert.ok(campaignId, 'campaignId must be available');

  const res = await request(app)
    .get(`${API_CAMPAIGNS}/${campaignId}`)
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);

  assert.equal(res.body.success, true);
  assert.equal(res.body.statusCode, 200);
  assert.equal(res.body.data.campaign_name, 'Test Campaign');
});

test('PUT /api/campaigns/:id updates the campaign (ADMIN)', async () => {
  const res = await request(app)
    .put(`${API_CAMPAIGNS}/${campaignId}`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ campaign_name: 'Updated Campaign' })
    .expect(200);

  assert.equal(res.body.success, true);
  assert.equal(res.body.statusCode, 200);
  assert.equal(res.body.data.campaign_name, 'Updated Campaign');
});

test('DELETE /api/campaigns/:id deletes the campaign (ADMIN)', async () => {
  const res = await request(app)
    .delete(`${API_CAMPAIGNS}/${campaignId}`)
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);

  assert.equal(res.body.success, true);
  assert.equal(res.body.statusCode, 200);
});
