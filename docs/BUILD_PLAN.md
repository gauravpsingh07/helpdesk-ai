# BUILD PLAN — "Helpdesk" Multi-Tenant AI Support SaaS

A complete, step-by-step implementation plan. This is the *how-to-build* companion to
[PROJECT_PLAN.md](PROJECT_PLAN.md) (the *what/why* spec). Nothing here gets coded until you approve.

---

## Table of contents
0. [Realistic timeline & scope reality](#0-realistic-timeline--scope-reality)
1. [Decisions to approve (defaults chosen)](#1-decisions-to-approve-defaults-chosen)
2. [Prerequisites, accounts & environment variables](#2-prerequisites-accounts--environment-variables)
3. [Phase 0 — Repo & tooling bootstrap](#phase-0--repo--tooling-bootstrap)
4. [Phase 1 — Data layer & multi-tenancy](#phase-1--data-layer--multi-tenancy)
5. [Phase 2 — Auth, RBAC & app shell](#phase-2--auth-rbac--app-shell)
6. [Phase 3 — Tickets CRUD + real-time + public widget](#phase-3--tickets-crud--real-time--public-widget)
7. [Phase 4 — RAG pipeline](#phase-4--rag-pipeline)
8. [Phase 5 — Agentic layer](#phase-5--agentic-layer)
9. [Phase 6 — Automation / background jobs](#phase-6--automation--background-jobs)
10. [Phase 7 — AI Operations (eval + observability)](#phase-7--ai-operations-eval--observability)
11. [Phase 8 — Governance & security](#phase-8--governance--security)
12. [Phase 9 — Testing & CI/CD](#phase-9--testing--cicd)
13. [Phase 10 — Deployment](#phase-10--deployment)
14. [Phase 11 — Documentation & polish](#phase-11--documentation--polish)
15. [Day-by-day schedule](#day-by-day-schedule)
16. [Definition of done](#definition-of-done)
17. [Risk register & cut list](#risk-register--cut-list)

---

## 0. Realistic timeline & scope reality

**Honest take:** the *full* feature set (multi-tenant SaaS + RAG + agents + eval + CI + governance +
deploy + docs) is a tight **3 long days** for an experienced full-stack dev, and **4–5 days** if you're
learning parts of the stack. I've split the work into:

- **CORE (must-build)** — the spine that makes every one of the 5 competency areas demonstrable. Fits ~3 days.
- **STRETCH (v2)** — polish that's nice but skippable; labeled "v2" in the README so it reads as a roadmap, not a gap.

Each phase below tags items `[CORE]` or `[STRETCH]`.

---

## 1. Decisions to approve (defaults chosen)

I picked sensible defaults so the plan is concrete. **Veto any of these and I'll swap them before building.**

| # | Decision | Default (recommended) | Alternative | Why this default |
|---|---|---|---|---|
| D1 | **Auth** | **Clerk** (built-in Organizations + roles) | Auth.js v5 (DIY RBAC) | Saves ~half a day on multi-tenant orgs; free tier fine. *Alt is more "I built RBAC myself" signal but slower.* |
| D2 | **Generation model** | **Google Gemini** — Flash-Lite (triage) + Flash (drafts), *free tier, no card* | Ollama local (Llama/Qwen) · Claude for final demo only | $0 forever; 1,500 req/day covers solo dev + CI easily |
| D3 | **Embeddings** | **Gemini `text-embedding-004`** (768-d), *free* | Ollama `nomic-embed-text` (768-d, fully local) | $0; same free Gemini key, or fully offline |
| D4 | **Real-time** | **Pusher Channels** | SSE (zero external dep) / Liveblocks | Simplest reliable pub/sub; free tier fine |
| D5 | **Background jobs** | **Inngest** | BullMQ + Redis | Easiest local dev + built-in cron + retries; no Redis to host |
| D6 | **Agent orchestration** | **Typed TS state machine** (in `lib/agent`) | LangGraph.js | Fewer deps, full control, easy to explain in interviews |
| D7 | **Eval scorer** | **TS LLM-as-judge** (single language) | Python + RAGAS | Keeps the repo one language; CI stays simple |
| D8 | **Vector store** | **Postgres + pgvector** | Qdrant / Pinecone | One database to run; hybrid search with native full-text |
| D9 | **Hosting** | **Vercel + Neon Postgres** | Railway / Fly.io | Best Next.js DX + serverless Postgres with pgvector |
| D10 | **Package manager** | **pnpm** | npm | Faster, disk-efficient |

> If you don't reply on these, I proceed with the defaults.

---

## 2. Prerequisites, accounts & environment variables

**Local tooling (install if missing):** Node ≥ 20, pnpm, Docker Desktop (for local Postgres+pgvector),
Git, GitHub CLI (`gh`, optional).

**Accounts / API keys to create (all have free tiers):**
- Google AI Studio (generation + embeddings) → `GEMINI_API_KEY` — **free, no credit card**
- *(optional, fully-local mode)* Ollama → `OLLAMA_BASE_URL` (no API key, $0, offline)
- Clerk (auth) → `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` *(if D1=Clerk)*
- Pusher (real-time) → `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `NEXT_PUBLIC_PUSHER_KEY`, `PUSHER_CLUSTER` *(if D4=Pusher)*
- Inngest (jobs) → `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` *(if D5=Inngest)*
- Neon (prod DB) → `DATABASE_URL` *(local dev uses Docker)*
- Vercel + GitHub for deploy/CI

**`.env.local` template** (I'll generate `.env.example` with all of these documented):
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/helpdesk
GEMINI_API_KEY=
# OLLAMA_BASE_URL=http://localhost:11434   # optional: fully-local, no API key
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
NEXT_PUBLIC_PUSHER_KEY=
PUSHER_CLUSTER=
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
AI_MONTHLY_COST_CAP_USD=20
```

---

## Phase 0 — Repo & tooling bootstrap
**Goal:** a running, linted, typed, testable empty app committed to GitHub. **Est: 1–1.5h. [CORE]**

Steps:
1. `pnpm create next-app@latest helpdesk` → TypeScript, App Router, Tailwind, ESLint, src dir = no, import alias `@/*`.
2. Add tooling: `prettier`, `prettier-plugin-tailwindcss`, strict `tsconfig` (`"strict": true`, `noUncheckedIndexedAccess`).
3. Testing: `vitest`, `@vitest/coverage-v8`, `@testing-library/react`, `playwright` (`pnpm exec playwright install chromium`).
4. `docker-compose.yml` with `pgvector/pgvector:pg16` (exposes 5432, volume for data).
5. Prisma: `pnpm add -D prisma && pnpm add @prisma/client && pnpm exec prisma init`.
6. Create folder skeleton (empty files with TODO headers) matching the repo layout in PROJECT_PLAN §5.
7. `git init`, `.gitignore` check, initial commit, create GitHub repo (`gh repo create`), push.

**Acceptance:** `pnpm dev` serves the landing page; `pnpm test` and `pnpm exec playwright test` run (0 tests OK); `docker compose up -d` starts Postgres.

---

## Phase 1 — Data layer & multi-tenancy
**Goal:** schema migrated, tenant-scoped access enforced, seed data, isolation proven by a test. **Est: 3–4h. [CORE]**

Files/steps:
1. `prisma/schema.prisma` — full schema from PROJECT_PLAN §4 (Tenant, User, Role, Document, Chunk, Ticket, Message, AiSuggestion, AuditLog, ApiKey). Add `vector` via `Unsupported("vector(768)")` (768-d matches Gemini/Ollama embeddings — change only if you swap models) + a raw-SQL migration to `CREATE EXTENSION vector` and an HNSW/IVFFlat index on `Chunk.embedding`.
2. `pnpm exec prisma migrate dev --name init`.
3. `lib/db/client.ts` — singleton Prisma client.
4. `lib/db/tenant.ts` — `getTenantDb(tenantId)`: a thin wrapper / repository whose every read & write is filtered by `tenantId`; throws if missing. (The interview talking point: tenancy enforced in one place, not sprinkled.)
5. `lib/auth/rbac.ts` — `requireRole(roles[])` guard usable in route handlers & server actions.
6. `prisma/seed.ts` — 2 tenants ("Acme", "Globex"), an ADMIN+AGENT+CUSTOMER each, 3 sample KB docs, a few tickets.
7. `tests/unit/tenant-isolation.test.ts` — asserts `getTenantDb(acme)` cannot read Globex rows.

**Acceptance:** migration applies on a clean DB; seed populates both tenants; isolation test passes.

---

## Phase 2 — Auth, RBAC & app shell
**Goal:** sign up → create org → land in an authed dashboard with role-aware nav. **Est: 3–4h. [CORE]**

Steps (D1=Clerk path; Auth.js path noted in parens):
1. Install + wrap app in `<ClerkProvider>`; add `middleware.ts` protecting `/(app)/*`.
2. Enable Clerk **Organizations**; map roles `admin`/`agent` to our `Role`. (Auth.js: build `Organization`+`Membership` tables + credentials/email provider + session callback embedding `tenantId`+`role`.)
3. `lib/auth/session.ts` — `getCurrentActor()` → `{ userId, tenantId, role }`, the single source used everywhere.
4. **Tenant sync:** Clerk org → our `Tenant` via webhook (`/api/webhooks/clerk`) or lazy upsert on first request.
5. App shell: `app/(app)/layout.tsx` (sidebar, org switcher, role-gated links), `dashboard/page.tsx` (counts).
6. CUSTOMER role: restricted view (their tickets only).

**Acceptance:** two browsers/orgs see only their own data; an AGENT cannot open admin-only settings; refresh keeps session.

---

## Phase 3 — Tickets CRUD + real-time + public widget
**Goal:** full ticket lifecycle with live updates, plus a rate-limited public intake endpoint. **Est: 4–5h. [CORE]**

Steps:
1. Ticket list (`/(app)/tickets`) with filters (status/assignee/tag); detail page with message thread.
2. Server actions / route handlers: create ticket, post message, change status/assignee — all tenant-scoped + audited.
3. **Real-time:** `lib/realtime.ts` (Pusher server) + client hook subscribing to `tenant-{id}-ticket-{id}`; new messages & presence appear without refresh. (SSE alt: a `/api/stream` route.)
4. **Public widget endpoint** `app/api/widget/route.ts` — unauthenticated, authenticated by `ApiKey` header, creates a ticket/message for that tenant.
5. `lib/ratelimit/tokenBucket.ts` — token-bucket limiter (per API key + per IP); returns `429` + `Retry-After`. Unit-tested for refill/burst/race behavior.

**Acceptance:** posting from the widget shows up live in the agent view; exceeding the limit returns 429; rate-limiter unit tests pass.

---

## Phase 4 — RAG pipeline
**Goal:** upload docs → searchable knowledge base with citations. **Est: 4–5h. [CORE]**

Steps:
1. Doc upload UI (`/(app)/settings/knowledge`) — paste text or upload `.md`/`.txt`/`.pdf` (`[STRETCH]` PDF parse).
2. `lib/rag/chunk.ts` — structure-aware chunking (by headings/paragraphs, ~500–800 tokens, overlap).
3. `lib/rag/embed.ts` — batch embeddings via Gemini `text-embedding-004` (768-d), or Ollama `nomic-embed-text` for fully-local.
4. `lib/rag/store.ts` — upsert chunks + vectors into pgvector.
5. `lib/rag/retrieve.ts` — **hybrid retrieval**: pgvector cosine + Postgres `tsvector` full-text, fused (Reciprocal Rank Fusion). `[STRETCH]` Cohere rerank.
6. Citations: retrieval returns `{chunkId, documentTitle, snippet}` carried through to the UI.
7. Wire ingestion to run as a job (Phase 6) with `Document.status` PENDING→INDEXED→FAILED.

**Acceptance:** uploading a doc indexes it; a query returns relevant chunks with titles; deleting a doc removes its chunks.

---

## Phase 5 — Agentic layer
**Goal:** the reply agent drafts grounded answers with human-in-the-loop; triage agent auto-classifies. **Est: 5–6h. [CORE]**

Steps:
1. `lib/ai/client.ts` — provider-agnostic LLM wrapper (Gemini default; Ollama/Claude swappable behind one interface) with **timeout (AbortController), retry+backoff, structured logging, token+cost capture, per-tenant monthly cost cap** (reads `AI_MONTHLY_COST_CAP_USD`, blocks + logs when exceeded). This is the "AI as a predictable dependency" centerpiece.
2. `lib/agent/replyAgent.ts` — typed state machine:
   `plan → retrieve(hybrid) → draft(with citations) → self-critique(faithfulness check) → {emit PENDING AiSuggestion | REFUSE/ESCALATE}`. Refuses when retrieval score < threshold or out-of-scope.
3. `lib/agent/triageAgent.ts` — Gemini Flash-Lite call → `{tags[], priority, suggestedAssignee}`; runs on ticket.created (Phase 6).
4. Human-in-the-loop UI: on a ticket, agent sees the AI draft + citations → **Accept / Edit / Reject**; action writes a `Message` (sender=AI/AGENT) + an `AuditLog` row + updates `AiSuggestion.status`.
5. Guardrails hook: every agent run passes input + retrieved text through the injection guard (Phase 8).

**Acceptance:** a customer question yields a cited draft; rejecting/accepting is recorded; an out-of-scope question is refused & escalated, not hallucinated.

---

## Phase 6 — Automation / background jobs
**Goal:** everything slow or scheduled runs async, idempotently. **Est: 2–3h. [CORE]**

Steps:
1. Inngest setup: `lib/inngest/client.ts`, `app/api/inngest/route.ts`, local dev via `npx inngest-cli dev`.
2. `jobs/ingestDocument.ts` — triggered on `document.uploaded`: chunk → embed → store → set status. Idempotent by `documentId`+content hash; retries with backoff.
3. `jobs/triageTicket.ts` — triggered on `ticket.created`: run triage agent, apply tags/priority/assignee.
4. `jobs/dailyDigest.ts` — Inngest **cron** (e.g., 8am): per-tenant open-ticket summary email (`[STRETCH]` real email via Resend; CORE = log/preview).

**Acceptance:** uploading triggers async indexing (UI shows PENDING→INDEXED); creating a ticket auto-tags it; cron fires the digest in dev.

---

## Phase 7 — AI Operations (eval + observability)
**Goal:** real numbers + a metrics page + a CI quality gate. **Est: 3–4h. [CORE]**

Steps:
1. `eval/golden.jsonl` — 30–50 rows `{question, mustContainFacts[], mustCite}` against a fixed sample corpus.
2. `lib/eval/score.ts` — runs the reply agent over the set; computes **faithfulness** (LLM-as-judge: does the draft stay within retrieved context?), **answer-relevancy**, **retrieval hit-rate**; writes `eval/report.json` + `eval/report.md`.
3. `pnpm eval` script; prints a summary table.
4. **Metrics page** `/(app)/metrics` — aggregates from `AiSuggestion`: total/avg cost, p50/p95 latency, acceptance rate, refusal rate, faithfulness trend. Simple charts (Recharts).
5. `[STRETCH]` Langfuse tracing integration for per-run traces.

**Acceptance:** `pnpm eval` produces a report with a faithfulness number ≥ target on the sample; metrics page renders live aggregates.

---

## Phase 8 — Governance & security
**Goal:** the layer almost no portfolio has. **Est: 3–4h. [CORE]**

Steps:
1. `lib/governance/pii.ts` — redact emails/phones/cards/SSNs on ingestion and in logs (regex + optional NER `[STRETCH]`).
2. `lib/governance/injectionGuard.ts` — sanitize/flag prompt-injection patterns in user input + retrieved chunks; enforce instruction hierarchy (system > developer > retrieved content).
3. `lib/governance/policy.ts` — refusal/escalation rules (low retrieval confidence, out-of-scope, restricted topics); decisions logged.
4. `lib/governance/audit.ts` — `audit(action, target, metadata)` used on: AI suggestion lifecycle, role changes, data export, doc delete, API-key issuance.
5. Per-tenant **cost cap** enforcement wired into `lib/ai/client.ts`.
6. `tests/unit/governance.test.ts` — PII redaction + injection flag + isolation regression.

**Acceptance:** PII is redacted in stored chunks & logs; an injected "ignore your instructions" doc doesn't hijack the agent; every sensitive action appears in `AuditLog`.

---

## Phase 9 — Testing & CI/CD
**Goal:** green pipeline that also gates AI quality. **Est: 3–4h. [CORE]**

Tests:
- **Unit (Vitest):** tenant isolation, RBAC guard, token-bucket limiter, chunker, PII redaction, eval scorer math.
- **E2E (Playwright):** signup → create org → upload doc → (widget) customer creates ticket → agent gets AI draft → accept & send. One happy-path spec.

CI — `.github/workflows/ci.yml`:
1. Spin up Postgres+pgvector service container.
2. `pnpm install`, `prisma migrate deploy`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
3. `pnpm exec playwright test` against the built app.
4. **Eval gate:** `pnpm eval` → fail the job if faithfulness < threshold (e.g., 0.85). *(Uses a tiny fixed corpus + a cheap model; mockable to control cost.)*

**Acceptance:** PR shows all checks green; deliberately lowering retrieval quality makes the eval gate fail.

---

## Phase 10 — Deployment
**Goal:** a public live URL with demo credentials. **Est: 2–3h. [CORE]**

Steps:
1. Neon project; set prod `DATABASE_URL`; `prisma migrate deploy`; enable pgvector.
2. Vercel project linked to the GitHub repo; add all env vars; configure Inngest + Pusher + Clerk **production** instances.
3. Deploy; run a prod smoke test of the happy path.
4. Seed a **demo tenant** with read-only demo creds; put them in the README.
5. `[STRETCH]` custom domain.

**Acceptance:** anyone can open the URL, log into the demo org, and watch an AI draft get generated.

---

## Phase 11 — Documentation & polish
**Goal:** the repo reads like a case study. **Est: 3–4h. [CORE for docs, STRETCH for load test]**

Deliverables:
1. `README.md` — problem, live demo + demo creds, architecture diagram, the **5-area table**, results/numbers, one-command local setup.
2. `docs/ARCHITECTURE.md` + a diagram (Excalidraw/Mermaid).
3. `docs/MODEL_CARD.md` (model, intended use, limits, eval scores), `docs/DATASHEET.md` (corpus provenance/refresh), `docs/THREAT_MODEL.md` (injection, exfiltration, tenant bleed + mitigations).
4. `docs/adr/0001…` — key decisions (pgvector, human-in-the-loop, hybrid retrieval).
5. **3-min Loom** walkthrough (script included).
6. `[STRETCH]` `k6`/`autocannon` load test → a real "N req/s" number for the README.

**Acceptance:** a stranger can understand, run, and evaluate the project from the README alone.

---

## Day-by-day schedule

| Day | Phases | Outcome at end of day |
|---|---|---|
| **Day 1** | 0, 1, 2, start 3 | Deployed-able skeleton: auth, multi-tenancy, RBAC, tickets CRUD, isolation test green |
| **Day 2** | finish 3, 4, 5, 6 | Real-time tickets + RAG + reply/triage agents + async jobs working locally |
| **Day 3** | 7, 8, 9, 10, 11 | Eval+metrics, governance, tests+CI green, **live deploy**, docs + Loom |

If a 4th day is available, it absorbs the `[STRETCH]` items + bug-bash + polish.

---

## Definition of done
- [ ] Live public URL with working demo org + read-only creds
- [ ] All 5 competency areas demonstrable (the §2 table holds true)
- [ ] CI green incl. the eval quality gate
- [ ] ≥1 Playwright e2e + the listed unit tests passing
- [ ] Tenant-isolation test + governance tests passing
- [ ] README case study + MODEL_CARD + DATASHEET + THREAT_MODEL + ≥2 ADRs
- [ ] 3-min Loom recorded
- [ ] A real number reported (faithfulness; ideally also req/s)

## Risk register & cut list
- **Time risk:** if behind by end of Day 2, cut to CORE only and drop Pusher→SSE, skip rerank/PDF/email/Langfuse/load-test (all already `[STRETCH]`).
- **Cost risk:** cap AI spend via `AI_MONTHLY_COST_CAP_USD`, use Haiku + small embeddings + caching; CI eval uses a tiny corpus.
- **Scope creep:** billing, SSO, fine-grained per-doc ACLs, multi-region = explicitly "v2" in README.
- **Auth complexity (if D1=Auth.js):** budget +0.5 day for hand-rolled orgs/RBAC.

---

## 18. Cost & free-tier strategy

**Bottom line: effectively free.** Every piece of infrastructure has a free tier that comfortably covers
a portfolio demo. The *only* thing that can cost money is LLM/embedding API calls — and even those can be $0.

> ✅ **SELECTED — 100% free, no credit card:** generation + embeddings on **Gemini's free tier**
> (or **Ollama** fully local), Clerk free auth, Neon + Vercel + Pusher + Inngest free tiers, public
> GitHub repo. **A credit card goes on *nothing*, so no service can ever charge you — the worst case
> is a free-tier rate limit, not a bill.**

| Service | Free for this project? | Notes |
|---|---|---|
| Next.js, Node, pnpm, Prisma, Vitest, Playwright, Docker, Postgres+pgvector (local) | ✅ Free | Open source |
| **GitHub + Actions (CI)** | ✅ Free | Unlimited Actions minutes **on public repos** — keep the repo public |
| **Vercel** (hosting) | ✅ Free | Hobby plan; personal/non-commercial only (a portfolio demo qualifies) |
| **Neon** (prod Postgres) | ✅ Free | 0.5 GB free tier is plenty |
| **Clerk** (auth) | ✅ Free | 50K MAU free; Organizations free up to **100 orgs** — a demo has ~2–5, so fine |
| **Pusher** (real-time) | ✅ Free | Sandbox: 200K msgs/day, 100 concurrent — or use SSE (zero dependency) |
| **Inngest** (jobs) | ✅ Free | Free tier covers a demo |
| **Anthropic Claude** (generation) | ⚠️ Pay-as-you-go | New accounts get **$5 free credit, no card**; realistically covers the build if you use Haiku for dev |
| **OpenAI** (embeddings) | ⚠️ Pay-as-you-go | Embeddings are pennies, but new accounts need billing set up |

**Realistic cost with the default stack:** **$0–$10.** Anthropic's $5 starter credit can cover the whole
build if you use **Haiku** for dev/testing and **Sonnet** only for final demos; embeddings cost cents.

**Zero-cost / no-credit-card mode:** swap the model provider to **Google Gemini's free tier** —
Gemini Flash gives **1,500 requests/day, 15 RPM, no card, no expiration**, and free embeddings too
(trade-off: Google may use free-tier prompts for training, fine for synthetic demo data). Since
`lib/ai/client.ts` is built provider-agnostic anyway, you can develop on Gemini-free and optionally
record the final demo on Claude. Embeddings can also run **locally via Ollama** (`nomic-embed-text`) for $0.

> Guardrails already in the plan: `AI_MONTHLY_COST_CAP_USD`, Haiku for cheap paths, caching, and a
> tiny CI eval corpus keep spend near zero.

---

## 19. Git workflow & commit guidance

**Target ~40–80 commits across the 3 days** (anywhere from ~30 to ~100 is healthy). **Quality and cadence
matter far more than the raw number** — recruiters skim history for signal, not totals.

What good looks like:
- **Atomic commits** — one logical change each (a feature, a test, a fix), never one giant "initial commit" dump.
- **Conventional Commits** style: `feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`, `ci:`, `perf:`.
- **Spread across all 3 days** → a green contribution graph that shows sustained work, not a midnight dump.
- The 12 phases × ~3–6 commits each lands you in the 40–70 range *naturally* — no padding needed.
- **Optional polish:** open 3–5 feature-branch → PR → merge cycles (shows you know the workflow even solo);
  tag a `v0.1.0` release.

Example commit trail (abbreviated):
```
chore: scaffold next.js + tooling          ci: postgres service + lint/test/build
feat(db): prisma schema + pgvector          ci: add eval quality gate
feat(db): tenant-scoped data layer          test(ratelimit): refill + burst
test(db): tenant isolation                  feat(gov): pii redaction + injection guard
feat(auth): clerk org + rbac guard          feat(gov): audit log on sensitive actions
feat(tickets): list + thread + realtime     feat(eval): golden set + faithfulness scorer
feat(widget): public intake + rate limit    feat(ops): metrics dashboard
feat(rag): structure-aware chunking          docs: readme case study + model card
feat(rag): hybrid retrieval (RRF)           docs: threat model + ADRs
feat(agent): reply agent state machine      ...
```

What to avoid: a single mega-commit; hundreds of `wip`/`update` noise commits; committing secrets or
`node_modules`; and artificially padding the count (it's obvious).

