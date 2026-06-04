# 0003 — Self-hosted Postgres job queue (not Inngest)

Status: Accepted

## Context
Need async work (document ingestion, auto-triage, scheduled digest). Inngest is nice but needs an
account + keys for production.

## Decision
A **Postgres-backed queue** (`Job` table). Workers claim due jobs atomically with
`UPDATE … WHERE id IN (SELECT … FOR UPDATE SKIP LOCKED)` so concurrent workers never double-process.
Failures retry with exponential backoff up to a cap. A `pnpm worker` loop runs it locally; a Vercel
daily cron (or any scheduler) hits `/api/jobs/run` in production.

## Consequences
- No new infrastructure (reuses Postgres); demonstrates the classic SKIP LOCKED pattern.
- Throughput is bounded by polling + a single DB; fine for this scale.
- Vercel Hobby crons are daily — real-time processing needs a long-running worker or a more frequent
  scheduler (documented in `DEPLOY.md`).
