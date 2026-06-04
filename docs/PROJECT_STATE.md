# PROJECT STATE — Helpdesk AI (living handoff doc)

> **Read this first if you're a fresh chat picking up the build.** It captures the *as-built* state,
> every key decision/deviation, how to run/verify, and what's left. The original plan is in
> `docs/BUILD_PLAN.md` (how-to) and `docs/PROJECT_PLAN.md` (spec) — but **this file is the source of
> truth for current status.** Keep it updated at every phase boundary.
>
> Last updated: end of **Phase 8** (Governance & security).

---

## TL;DR
- **What:** multi-tenant AI customer-support SaaS. Portfolio project to land full-stack/SWE roles; demonstrates Agentic design · RAG · AI Ops · Automation · Governance.
- **Where:** `D:\Projects\helpdesk` (Windows / PowerShell). **GitHub:** https://github.com/gauravpsingh07/helpdesk-ai (public, `origin/main`).
- **Status:** Phases 0–8 done & pushed. Phases 9–11 remain. ~44 commits, 24 unit + 8 integration tests, build green, eval gate passing.
- **Resume:** start Docker → `docker compose up -d` → `pnpm dev` + `pnpm worker` → log in `admin@acme.test` / `Password123!`.

## Process rules (the user set these — follow exactly)
1. **One phase at a time.** Stop after each phase and get **explicit approval** before starting the next.
2. **≥ 6–8 atomic commits per phase** (Conventional Commits), **pushed after each phase**.
3. Verify (typecheck · lint · unit · integration · build) **before** committing.
4. Commit trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
5. Keep it **$0 / no external accounts** (that's why Auth.js/SSE/self-hosted-queue/Gemini-free were chosen).

---

## Stack & KEY DECISIONS (deviations from the original plan)
| Area | As-built (NOT the plan's default) |
|---|---|
| Framework | Next.js **16.2.7** (App Router, Turbopack), React 19, TypeScript, Tailwind 4, pnpm |
| DB | Postgres + **pgvector**, **Prisma 7.8** |
| Auth | **Auth.js v5 (`next-auth@beta`)** self-hosted credentials + JWT — *NOT Clerk*. bcryptjs, JWT carries `tenantId`+`role`. |
| Real-time | **In-process SSE** (`lib/realtime.ts` + `/api/stream/[ticketId]`) — *NOT Pusher*. |
| Jobs | **Self-hosted Postgres queue** (`lib/jobs/*`, `FOR UPDATE SKIP LOCKED`) — *NOT Inngest*. Worker = `pnpm worker`. |
| AI | **Google Gemini free tier** via raw REST (`lib/ai/gemini.ts`, no SDK) — *NOT Claude/OpenAI*. |

**Gemini models (current — `text-embedding-004` is RETIRED/404):**
- Embeddings: `gemini-embedding-001` with `outputDimensionality: 768` (matches `Chunk.embedding vector(768)`).
- Drafts: `gemini-2.5-flash`. Triage + faithfulness grader: `gemini-2.5-flash-lite`.
- Needs `GEMINI_API_KEY` in `.env` (free, no card — https://aistudio.google.com/apikey).

**Prisma 7 specifics (important):**
- New `prisma-client` generator → output to **`lib/generated/prisma`** (gitignored). Import: `@/lib/generated/prisma/client` (PrismaClient + `Prisma` namespace) and `.../enums`.
- Runtime connects via **`@prisma/adapter-pg`** (driver adapter) in `lib/db/client.ts`; CLI/migrations read `DATABASE_URL` via `prisma.config.ts` (`import "dotenv/config"`).
- **Migrations are non-interactive-hostile:** `prisma migrate dev` aborts with "environment is non-interactive". Use `prisma migrate dev --name X --create-only` → (edit SQL if needed) → `prisma migrate deploy`. For data-loss changes (drops), create-only also prompts → **hand-write the migration SQL** then `migrate deploy`.
- pgvector: column is `Unsupported("vector(768)")`; `CREATE EXTENSION vector` + HNSW index are **raw SQL in the init migration**. Reads/writes of embeddings use `$queryRaw`/`$executeRaw`.

**Tenancy:** `lib/db/tenant.ts` `getTenantDb(tenantId)` — Prisma `$extends` injects `tenantId` into `where` for reads/updates/deletes (uses extendedWhereUnique). **Creates must pass `tenantId` explicitly** (type-level). `User.email` is **globally unique** (one user = one tenant; login by email).

---

## Progress
| Phase | Status | Delivered |
|---|---|---|
| 0 Scaffold | ✅ | Next/TS/Tailwind/Prisma/Vitest/Docker, CI-LF, repo |
| 1 Data + multi-tenancy | ✅ | 9-model schema + pgvector(768)+HNSW, `getTenantDb`, RBAC core, seed, isolation tests |
| 2 Auth + RBAC | ✅ | Auth.js credentials+JWT, middleware, role-aware shell (dashboard + admin settings) |
| 3 Tickets + real-time + widget | ✅ | Ticket lifecycle, SSE live thread, rate-limited public widget, audit log |
| 4 RAG | ✅ | Gemini client, chunking, embeddings, pgvector store, hybrid retrieve (vector+FTS+RRF), KB UI |
| 5 Agentic | ✅ | Reply agent (retrieve→draft+cite→self-critique faithfulness→refuse/escalate), triage agent, human-in-the-loop panel, cost tracking |
| 6 Background jobs | ✅ | Postgres queue (SKIP LOCKED, backoff), worker, async ingest, auto-triage on create, self-rescheduling digest, `/api/jobs/run` |
| 7 AI Operations | ✅ | eval harness (golden set + faithfulness scorer + `eval/report.md` + `pnpm eval` gate), `/metrics` page (cost / p95 latency / acceptance / refusal / faithfulness) |
| 8 Governance | ✅ | PII redaction (ingest), prompt-injection sanitize + restricted-topic refusal (agent), per-tenant monthly cost cap, audit log. Governance *docs* (model card/datasheet/threat-model) deferred to Phase 11 |
| **9 Testing & CI/CD** | ⏳ next | Playwright e2e (signup→ticket→AI draft→send), GitHub Actions (lint/typecheck/test/build/e2e + eval gate), Postgres service |
| 10 Deploy | ⏳ | Neon Postgres, Vercel, env, `vercel.json` cron→`/api/jobs/run`, demo creds |
| 11 Docs | ⏳ | README case study, ARCHITECTURE+diagram, MODEL_CARD, DATASHEET, THREAT_MODEL, ADRs, 3-min Loom |

---

## Architecture / file map
```
app/(auth)/sign-in        sign-in page (client) -> lib/actions/auth
app/(app)/layout.tsx      authed shell (requireActor) + role-aware nav + sign-out
app/(app)/dashboard       counts
app/(app)/tickets         list / [id] detail (thread + AI panel) / new
app/(app)/knowledge       KB: add doc + live retrieval search
app/(app)/settings        admin-only: members
app/api/auth/[...nextauth] Auth.js handlers
app/api/stream/[ticketId] SSE stream (auth-checked)
app/api/widget            public, API-key + rate-limited ticket intake
app/api/jobs/run          job processor (Vercel Cron / curl; secret-gated)
auth.ts / auth.config.ts / middleware.ts   Auth.js (node / edge / route gate)
lib/db/client.ts          Prisma client (pg adapter)
lib/db/tenant.ts          getTenantDb() tenant-scoped client
lib/auth/{rbac,session}.ts RBAC core + getCurrentActor/requireActor/requireRole
lib/ai/{gemini,cost}.ts   Gemini REST client (embed/generate) + cost estimate
lib/rag/{chunk,rrf,store,retrieve,ingest}.ts  RAG pipeline
lib/agent/{replyAgent,triageAgent}.ts  agents
lib/ai/grade.ts           shared faithfulness grader (agent + eval)
lib/eval/{golden,scorer,run}.ts  eval harness; scripts/eval.ts = `pnpm eval` gate -> eval/report.md
app/(app)/metrics         admin/agent: AI-ops metrics (cost/latency/acceptance/refusal/faithfulness)
lib/jobs/{backoff,queue,handlers,run}.ts  job queue
lib/{audit,apikey,realtime,ratelimit/tokenBucket}.ts  cross-cutting
lib/governance/{pii,injection,costCap,policy}.ts  guards: PII redaction, injection sanitize, cost cap, refusal
lib/actions/{auth,tickets,documents,agent}.ts  server actions
scripts/worker.ts         `pnpm worker` (tsx)
prisma/schema.prisma, prisma/migrations, prisma/seed.ts
tests/unit/*, tests/integration/*   vitest
```
**Data model (11):** Tenant, User(role,passwordHash,email@unique), Document, Chunk(vector768), Ticket(tags,priority,status), Message(sender CUSTOMER|AGENT|AI), AiSuggestion(draft,citations,faithfulness,refused,cost,tokens,latency,status), AuditLog, ApiKey, Job(type,payload,status,attempts,runAt) + enums.

---

## How to run / verify
```powershell
# Tool resets cwd to D:\New each command — always cd first:
Set-Location 'D:\Projects\helpdesk'

# 1. Docker Desktop must be RUNNING (it has been flaky — relaunch if engine is down).
docker compose up -d            # Postgres+pgvector; data persists in volume helpdesk_helpdesk-pgdata

# 2. Env: copy .env.example -> .env, then set DATABASE_URL (local default ok),
#    AUTH_SECRET (node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"),
#    GEMINI_API_KEY (free).

# 3. Install + DB
pnpm install                    # if junctions broke after a move: $env:CI='true'; pnpm install
pnpm exec prisma migrate deploy
pnpm db:seed

# 4. Run
pnpm dev                        # http://localhost:3000
pnpm worker                     # separate terminal: drains the job queue

# 5. Verify
pnpm typecheck; pnpm lint; pnpm test; pnpm test:int; pnpm eval; pnpm build
```
**Demo:** tenants `acme` + `globex`; users `admin@/agent@/customer@{slug}.test`, password `Password123!`; widget keys `hd_demo_acme`, `hd_demo_globex`. AI integration tests auto-skip when `GEMINI_API_KEY` is unset.

---

## Gotchas / lessons (don't re-discover these)
- **pnpm 11** blocks build scripts → approved in `pnpm-workspace.yaml` `allowBuilds` (sharp, unrs-resolver, esbuild, prisma...).
- **prisma migrate dev** is interactive → `--create-only` + `migrate deploy`; hand-write SQL for drops.
- **Moving the project on Windows** breaks pnpm junctions (absolute) → `$env:CI='true'; pnpm install` to repair.
- **tsx** resolves the `@/` alias ✓, but uses a **CJS transform** → no top-level await in scripts (use `(async()=>{...})()`, like `seed.ts`/`worker.ts`). Load env via `import 'dotenv/config'` or `--env-file=.env`.
- **git pathspec** treats `[id]` as a glob → `git add` the parent dir, or set `GIT_LITERAL_PATHSPECS=1`.
- **Docker Desktop** stops sometimes → relaunch `Start-Process 'C:\Program Files\Docker\Docker\Docker Desktop.exe'`, wait for `docker inspect -f '{{.State.Health.Status}}' helpdesk-db` = healthy.
- **PowerShell `2>&1` on native** wraps stderr as an error (e.g. `git push` looks like it errored but `PUSH=0` and it succeeded).
- **Next 16** warns `middleware` is deprecated in favor of `proxy` — warning only, still works (could rename in cleanup).
- **Vercel Hobby cron** is daily-only → for prod job processing run a worker or note the limitation (local demo uses `pnpm worker`).

## Commit tally
~44 commits (Phase 0–8). Each phase = 6–9 atomic commits. Verify with `git log --oneline | Measure-Object`.
