# Helpdesk AI

[![CI](https://github.com/gauravpsingh07/helpdesk-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/gauravpsingh07/helpdesk-ai/actions/workflows/ci.yml)

A multi-tenant, Zendesk-style **AI customer-support platform**. Companies sign up, their agents handle
tickets, and an **AI agent drafts grounded, cited replies** from that company's knowledge base — which a
human approves before it's sent. It also auto-triages incoming tickets and exposes a rate-limited public
widget for websites to file tickets.

Built as a production-grade full-stack app that also showcases agentic AI, RAG, AI-Ops, automation, and
governance — **$0 to run** (Gemini free tier, self-hosted everything else).

## Why it's interesting

Most AI demos are a chatbot. This is the **production scaffolding around** one: multi-tenancy with
proven isolation, real auth + RBAC, real-time, a background-job queue, an **evaluation gate in CI**, and
a governance layer (PII redaction, prompt-injection defense, cost caps, audit log).

## The five competency areas → where to look

| Area | In this repo |
| --- | --- |
| **Agentic system design** | Reply agent: plan → retrieve → draft w/ citations → **self-critique faithfulness** → refuse/escalate, with human-in-the-loop approval. Triage agent. (`lib/agent/*`) |
| **Data / RAG pipeline** | Chunk → embed (768-d) → pgvector; **hybrid retrieval** (vector + Postgres full-text) fused with Reciprocal Rank Fusion. (`lib/rag/*`) |
| **AI Operations** | Golden-set eval (`pnpm eval`) that **fails CI on faithfulness regression**; live `/metrics` (cost, p95 latency, acceptance/refusal, faithfulness). (`lib/eval/*`, `app/(app)/metrics`) |
| **Automation** | Self-hosted Postgres job queue (`FOR UPDATE SKIP LOCKED`, backoff): async ingestion, auto-triage on ticket creation, scheduled digest. (`lib/jobs/*`) |
| **Governance & docs** | PII redaction, prompt-injection sanitizer, per-tenant cost cap, restricted-topic refusal, audit log + model card / datasheet / threat model. (`lib/governance/*`, `docs/`) |

## Tech stack
Next.js 16 (App Router, server actions) · React 19 · TypeScript · Tailwind 4 · PostgreSQL + **pgvector** ·
Prisma 7 (pg driver adapter) · Auth.js v5 (credentials + JWT) · **Google Gemini** (free tier) · Vitest +
Playwright · GitHub Actions.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the diagram and component map.

## Highlights
- **Multi-tenancy** enforced in one place (`getTenantDb` Prisma extension) and **proven by a test** that tenant A can't read tenant B.
- **Auth + RBAC** (admin / agent / customer) self-hosted on Postgres — no third-party identity service.
- **Real-time** ticket threads over SSE.
- **Hybrid RAG** with citations; the agent **refuses and escalates** instead of hallucinating when grounding is weak.
- **Eval-gated CI**: the build fails if answer faithfulness regresses.
- **Governed AI**: PII never reaches the vector store; injected instructions in docs are neutralized; spend is capped per tenant.

## Results
- Eval (golden set): **faithfulness 100%**, recall 100%, retrieval-hit 100% — see [`eval/report.md`](eval/report.md).
- **24 unit + 8 integration + 1 e2e** tests; CI green (lint · typecheck · tests · build · e2e · eval).

## Run locally
```bash
# prerequisites: Node 20+, pnpm, Docker
cp .env.example .env          # set AUTH_SECRET and a free GEMINI_API_KEY (see comments)
docker compose up -d          # Postgres + pgvector
pnpm install
pnpm exec prisma migrate deploy && pnpm db:seed
pnpm dev                      # http://localhost:3000
pnpm worker                   # (separate terminal) drains the job queue
```
Sign in with a seeded demo user — **`admin@acme.test` / `Password123!`** (also `agent@…`, `customer@…`).
Two tenants (`acme`, `globex`) demonstrate isolation.

Verify everything: `pnpm typecheck && pnpm lint && pnpm test && pnpm test:int && pnpm build && pnpm e2e && pnpm eval`

## Deploy
Deploy-ready for **Neon + Vercel** (both free). Step-by-step in [`docs/DEPLOY.md`](docs/DEPLOY.md).

## Docs
[Architecture](docs/ARCHITECTURE.md) · [Model card](docs/MODEL_CARD.md) · [Datasheet](docs/DATASHEET.md) ·
[Threat model](docs/THREAT_MODEL.md) · [ADRs](docs/adr) · [Deploy runbook](docs/DEPLOY.md)

## Development
Built in 12 reviewed phases — each tested, atomically committed (Conventional Commits), and CI-gated —
with AI pair-programming (Claude Code). Project status & decisions live in
[`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md).
