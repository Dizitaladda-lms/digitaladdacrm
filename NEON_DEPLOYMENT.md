# Neon + Render + Vercel deployment

1. In the Neon Console, open **Connect** and copy the **pooled connection
   string**. Its hostname includes `-pooler`; Neon recommends it for deployed
   application traffic.
2. In the Neon SQL Editor, run [server/dizitaladda_crm.sql](server/dizitaladda_crm.sql) once.
   This is the consolidated, idempotent schema for the current CRM tables,
   migrations, indexes, constraints, and required reference data. It does not
   create default user accounts or hardcoded credentials.
3. Deploy the Render service with [render.yaml](render.yaml). In Render's
   Environment settings, set `DATABASE_URL` to the complete Neon pooled
   connection string. Keep `DB_SSL=true` and `DB_POOL_MAX=5`.
4. Deploy `frontend` as the Vercel project root. Set
   `VITE_API_URL=https://<render-service>.onrender.com/api` in Vercel.
5. After Vercel gives you its production URL, set Render's `CLIENT_URL` to that
   exact origin, for example `https://dizitaladda-crm.vercel.app`, and redeploy Render.
6. **Create the Initial Administrator Account:**
   Because fresh databases contain no default accounts, provision the first administrator using the secure CLI script:
   ```sh
   # Interactive prompt:
   npm run create:admin

   # Or non-interactive via environment variables / arguments:
   ADMIN_EMAIL="admin@yourdomain.com" ADMIN_PASSWORD="SecurePassword#2026" npm run create:admin
   # or
   npm run create:admin -- --email admin@yourdomain.com --password "SecurePassword#2026" --name "System Administrator"
   ```
   **Security Policy:**
   - Password must be at least 12 characters long and contain uppercase, lowercase, digit, and symbol.
   - Hashed with bcrypt cost factor 12 + HMAC pepper.
   - The user is created with `must_change_password = TRUE`, requiring a password rotation immediately upon initial login.

Do not commit `DATABASE_URL`, Neon passwords, or JWT secrets. Add them only in
the Render dashboard. `VITE_API_URL` is safe to expose because it only contains
the public API address.
