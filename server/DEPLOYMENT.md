Deployment checklist - DIZITALADDA CRM Backend

- Ensure environment variables set: `DATABASE_URL`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `PORT`, `DB_SSL` (if required).
- Run DB migrations / init script:

  npm run db:init

- Seed CI/test admin (optional):

  npm run db:seed:test

- Install production dependencies:

  npm ci --production

- Build / start:

  NODE_ENV=production node server.js

- Verify health endpoint: `GET /api/health` should return 200.
- Ensure logs are writable: `server/logs/`.
- Rotate secrets and ensure `JWT_SECRET` and `REFRESH_TOKEN_SECRET` are strong.
- Ensure DB backups and connection pooling configured for production.

CI suggestion:
- Run `npm run ci` in CI pipeline. Configure a job to run tests and optionally `npm run db:seed:test` before tests if using a shared DB.
