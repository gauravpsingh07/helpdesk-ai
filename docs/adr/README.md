# Architecture Decision Records

Short records of the load-bearing choices. Each was driven by two constraints: **$0 / no external
accounts** and **demonstrate the engineering** (not just glue a SaaS together).

- [0001 — Self-hosted auth with Auth.js (not Clerk)](0001-self-hosted-auth.md)
- [0002 — Real-time via SSE (not Pusher)](0002-realtime-sse.md)
- [0003 — Self-hosted Postgres job queue (not Inngest)](0003-postgres-job-queue.md)
- [0004 — Google Gemini free tier for AI (not Claude/OpenAI)](0004-gemini-free-tier.md)
- [0005 — Tenant isolation via a Prisma client extension](0005-tenant-isolation.md)
