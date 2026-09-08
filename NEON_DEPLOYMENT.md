# Neon + Render + Vercel deployment

1. In the Neon Console, open **Connect** and copy the **pooled connection
   string**. Its hostname includes `-pooler`; Neon recommends it for deployed
   application traffic.
2. In the Neon SQL Editor, run [server/iem_lms.sql](server/iem_lms.sql) once.
   It creates the application tables and loads the current seed data.
3. Deploy the Render service with [render.yaml](render.yaml). In Render's
   Environment settings, set `DATABASE_URL` to the complete Neon pooled
   connection string. Keep `DB_SSL=true` and `DB_POOL_MAX=5`.
4. Deploy `frontend` as the Vercel project root. Set
   `VITE_API_URL=https://<render-service>.onrender.com/api` in Vercel.
5. After Vercel gives you its production URL, set Render's `CLIENT_URL` to that
   exact origin, for example `https://dizitaladda-crm.vercel.app`, and redeploy Render.

Do not commit `DATABASE_URL`, Neon passwords, or JWT secrets. Add them only in
the Render dashboard. `VITE_API_URL` is safe to expose because it only contains
the public API address.
