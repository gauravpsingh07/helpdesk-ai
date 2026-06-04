# Deploy runbook — Neon + Vercel (100% free, no credit card)

The app is deploy-ready. This walks through a free production deploy.

## 1. Database — Neon (free)
1. Create an account at https://neon.tech and a new project (region near you).
2. Copy the **pooled** connection string (looks like `postgresql://USER:PASS@ep-xxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require`).
3. Apply the schema + seed (run locally, pointing at Neon):
   ```powershell
   $env:DATABASE_URL = '<your-neon-pooled-url>'
   pnpm exec prisma migrate deploy   # creates tables + the pgvector extension/index
   pnpm db:seed                       # demo tenants/users (optional, for the demo)
   ```
   > Neon ships the `vector` extension; the init migration runs `CREATE EXTENSION IF NOT EXISTS vector`.

## 2. Hosting — Vercel (free Hobby)
1. Push is already on GitHub: `https://github.com/gauravpsingh07/helpdesk-ai`.
2. At https://vercel.com → **Add New → Project → import the repo**. Framework auto-detected (Next.js).
3. Add **Environment Variables** (Production):
   | Key | Value |
   | --- | --- |
   | `DATABASE_URL` | your Neon pooled URL |
   | `AUTH_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
   | `AUTH_TRUST_HOST` | `true` |
   | `GEMINI_API_KEY` | your free Google AI Studio key |
   | `CRON_SECRET` | any random string (authorizes the Vercel cron → `/api/jobs/run`) |
4. **Deploy.** The build runs `prisma generate` (postinstall) then `next build`.

## 3. Background jobs in production
- `vercel.json` registers a **daily cron** → `GET /api/jobs/run` (drains the queue + runs the digest).
- Vercel **Hobby crons run once/day**. For faster processing, run the worker (`pnpm worker`) on any always-on host, or upgrade Vercel, or point an external scheduler (cron-job.org) at `/api/jobs/run` with header `x-jobs-secret: <CRON_SECRET>`.

## 4. Verify
- `https://<your-app>.vercel.app/api/health` → `{ "status": "ok", "db": "up" }`
- Sign in with a seeded demo user (`admin@acme.test` / `Password123!`) — or remove the seed and create your own org.

## Notes
- Demo seed data (including the guessable widget keys `hd_demo_*`) is for local/demo only — don't seed a real production workspace.
- Vercel Hobby is non-commercial; fine for a portfolio.
