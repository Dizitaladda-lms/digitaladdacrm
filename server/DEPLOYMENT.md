Deployment checklist - DIZITALADDA CRM Backend

- Ensure environment variables set: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `PORT`, `DB_SSL` (if required). Keep both JWT secrets stable across restarts and identical across every application instance; generate strong values and store them in the deployment's secret manager.
- Access cookies default to 15 minutes (`JWT_EXPIRES_IN=15m`) and refresh cookies default to 30 days (`JWT_REFRESH_EXPIRES_IN=30d`). Refresh tokens are rotated and stored hashed in PostgreSQL; rotation extends the refresh lifetime while the user remains active.
- The app uses JWT cookies and a PostgreSQL refresh-token table, not Express sessions or MemoryStore. Cookie-authenticated unsafe requests require a trusted `Origin`; keep `CLIENT_URL`/`ALLOWED_ORIGINS` exact (including any Vercel preview frontend origins).
- Run DB migrations before deploying the new application code:

  npm run db:migrate

- Device binding migration: `20261015_add_employee_device_binding.sql` creates device slots, blocked-attempt/admin-audit tables, and the refresh-token device binding. Existing access/refresh sessions have no approved device record and require users to sign in again after rollout; apply migrations before deploying the new application code.

- Seed CI/test admin (optional):

  npm run db:seed:test

- Install production dependencies:

  npm ci --production

- Build / start:

  NODE_ENV=production node server.js

- Verify health endpoint: `GET /api/health` should return 200.
- Ensure logs are writable: `server/logs/`.
- Rotate secrets only as a planned auth event; changing either JWT secret invalidates affected tokens and signs users out.
- Ensure DB backups and connection pooling configured for production.
- Verify device binding with a clean test account: sign in on one laptop and one mobile browser (both auto-approve), then try a second laptop (blocked and logged). Clear only the `deviceId` cookie and retry from the approved browser (the IndexedDB/localStorage id restores it). Revoke the laptop in Employees → Devices and confirm the old device is blocked while the next laptop can claim the slot.
- A browser UUID is a persistent browser-profile identifier, not hardware attestation. It stops a stolen refresh token from working alone on a different profile, but cannot resist an attacker who also copies browser storage/cookies or runs script in the approved browser.

CI suggestion:
- Run `npm run ci` in CI pipeline. Configure a job to run tests and optionally `npm run db:seed:test` before tests if using a shared DB.
