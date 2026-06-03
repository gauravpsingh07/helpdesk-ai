# Project Plan — "Helpdesk": A Multi-Tenant AI Support Platform

> A build-ready spec for one flagship project that demonstrates **full-stack/software-engineering depth**
> while covering all five competency areas: Agentic System Design · Data/RAG Pipeline · AI Operations ·
> Programming for Automation · Governance & Documentation.
>
> **Timeline:** 2–3 focused days. **Goal:** land full-stack / software-engineer roles.

---

## 0. The one-line pitch

> A Zendesk/Intercom-style SaaS where companies sign up, their agents handle support tickets, and an
> **AI agent drafts grounded replies** from that company's knowledge base (human approves before send)
> and **auto-triages** incoming tickets — built as a real multi-tenant product with auth, real-time,
> background jobs, rate limiting, tests, CI/CD, and a live deployment.

**The domain is swappable without changing the engineering.** If "helpdesk" doesn't excite you, the
exact same architecture works as:
- an **internal IT/HR assistant** (employees ask, agent drafts from policy docs), or
- a **docs-Q&A SaaS** (companies upload docs, their users get a grounded chat widget).

Pick whichever you'd enjoy demoing. The rest of this plan is domain-agnostic.

---

## 1. Why this project (the strategy)

For SWE roles the AI is the **cherry, not the cake**. What earns the offer is proof you can ship a
*real system*. Multi-tenant SaaS is the canonical "I can build a real product" signal, and it forces
you to implement every depth marker hiring managers look for:

- multi-tenancy + data isolation
- auth + role-based access control (RBAC)
- real-time updates (WebSockets/SSE)
- background job queue
- rate limiting
- tests + CI/CD + live deployment

The AI layer is what makes it *memorable* — and it's exactly where your five competency areas live.

---

## 2. The centerpiece — how each area maps to concrete features

Keep this table. It's your interview cheat-sheet: for every area you can point at a real file/feature.

| Area | Concrete feature in this project | Where it lives |
|---|---|---|
| **Agentic System Design** | Reply agent (plan → retrieve → draft → self-critique → request human approval) + auto-triage agent (classify, tag, route, set priority). Agent **escalates** when retrieval confidence is low. | `lib/agent/*` |
| **Data/RAG Pipeline** | Per-tenant KB: ingest → structure-aware chunk → embed → **hybrid retrieval (vector + keyword) + rerank**, with citations threaded to the UI. Auto-reindex on document change. | `lib/rag/*`, `jobs/ingest.ts` |
| **AI Operations** | Golden eval set + faithfulness scorer, **CI gate that fails the build on regression**, per-suggestion cost/latency/token tracking, a live metrics page (cost, p95 latency, acceptance rate, refusal rate). | `lib/eval/*`, `.github/workflows/ci.yml`, `app/(app)/metrics` |
| **Programming for Automation** | Background queue: document ingestion, auto-tagging on ticket create, **scheduled daily digest emails**. Everything that can run async, does. | `jobs/*` (Inngest/BullMQ) |
| **Governance & Documentation** | Strict tenant isolation (+ an isolation test), PII redaction, prompt-injection guard, **full audit log of every AI suggestion & sensitive action**, refusal policy. Written artifacts: model card, datasheet, threat model, ADRs. | `lib/governance/*`, `docs/*` |

---

## 3. Architecture

```
                         ┌─────────────────────────────────────────┐
   Public widget  ──▶    │  /api/widget  (rate-limited, token bucket)│
   (customer)            └───────────────┬───────────────────────────┘
                                         │
   Agent / Admin  ──▶  Next.js App ──▶  API route handlers ──▶  Postgres (Prisma, tenant-scoped)
   (authed, RBAC)        │  (real-time via WS/SSE)              + pgvector (embeddings)
                         │
                         ├──▶  Job queue (Inngest/BullMQ)
                         │       • ingest → chunk → embed
                         │       • auto-triage on ticket.created
                         │       • scheduled digest
                         │
                         └──▶  AI layer  (lib/ai: timeout + retry + cost cap)
                                 ├─ Reply agent (RAG + self-critique + human approval)
                                 └─ Triage agent (classify/tag/route)
```

**Cross-cutting:** every AI call is wrapped with a timeout, retry-with-backoff, a fallback path
("no draft — human handles"), and a per-tenant monthly cost cap. *Treat AI as just another system
dependency that behaves predictably in production* — this is a top SWE-maturity talking point.

---

## 4. Data model (Prisma sketch)

```prisma
model Tenant   { id String @id; name String; plan String; createdAt DateTime @default(now()) }

model User     { id String @id; email String @unique; name String; tenantId String;
                 role Role; createdAt DateTime @default(now()) }
enum Role      { ADMIN AGENT CUSTOMER }

model Document { id String @id; tenantId String; title String; sourceUrl String?;
                 status DocStatus; createdAt DateTime @default(now()) }
enum DocStatus { PENDING INDEXED FAILED }

model Chunk    { id String @id; documentId String; tenantId String; content String;
                 embedding Unsupported("vector(1536)"); tokenCount Int }

model Ticket   { id String @id; tenantId String; subject String; status TicketStatus;
                 priority Int; tags String[]; createdById String; assigneeId String?;
                 createdAt DateTime @default(now()) }
enum TicketStatus { OPEN PENDING RESOLVED }

model Message  { id String @id; ticketId String; tenantId String; authorId String;
                 sender Sender; body String; createdAt DateTime @default(now()) }
enum Sender    { CUSTOMER AGENT AI }

model AiSuggestion { id String @id; ticketId String; tenantId String; draft String;
                     citations Json; faithfulness Float?; model String;
                     promptTokens Int; completionTokens Int; costUsd Float; latencyMs Int;
                     status SuggestionStatus; createdAt DateTime @default(now()) }
enum SuggestionStatus { PENDING ACCEPTED EDITED REJECTED }

model AuditLog { id String @id; tenantId String; actorId String?; action String;
                 target String; metadata Json; createdAt DateTime @default(now()) }

model ApiKey   { id String @id; tenantId String; hashedKey String; rateLimitPerMin Int;
                 createdAt DateTime @default(now()) }
```

`AiSuggestion` (cost/faithfulness/status) and `AuditLog` are what make the AI Operations and
Governance stories *visible in the schema itself*.

---

## 5. Repo structure

```
/app
  /(marketing)            landing page
  /(app)/dashboard        authed home
  /(app)/tickets          ticket list + detail (real-time)
  /(app)/metrics          AI ops dashboard (cost, latency, acceptance, refusal)
  /(app)/settings         KB upload, members, API keys
  /api/...                route handlers
  /api/widget             PUBLIC, rate-limited customer endpoint
/lib
  /auth                   session + rbac() guard helpers
  /db                     prisma client + getTenantDb(tenantId) scoped access
  /rag                    ingest, chunk, embed, retrieve, rerank
  /agent                  replyAgent, triageAgent (orchestrator or LangGraph)
  /ai                     model client: timeout, retry, cost tracking, cost cap
  /ratelimit              token-bucket limiter
  /governance             piiRedact, auditLog, policy/refusal checks, injection guard
  /eval                   scorer + report generator
/jobs                     inngest functions: ingest, triage, digest
/components               UI
/tests                    vitest unit + playwright e2e
/eval/golden.jsonl        golden Q/A set
/.github/workflows/ci.yml lint + test + eval gate
/docs                     ARCHITECTURE.md, MODEL_CARD.md, DATASHEET.md,
                          THREAT_MODEL.md, adr/0001-*.md
README.md                 case-study style
```

---

## 6. Stack (most marketable per 2026 hiring data)

- **Frontend/Backend:** Next.js (App Router) + TypeScript
- **DB:** PostgreSQL + Prisma + **pgvector**
- **Auth:** Clerk (fastest) or NextAuth — orgs/tenants + 3 roles
- **Real-time:** Liveblocks or Pusher (or plain SSE to keep it dependency-light)
- **Jobs:** Inngest (easiest) or BullMQ + Redis
- **AI:** Anthropic / OpenAI (small models + caching to keep cost near zero)
- **Tests:** Vitest (unit) + Playwright (one e2e)
- **CI/CD:** GitHub Actions → **deploy live** on Vercel + Neon/Supabase Postgres

---

## 7. The 2–3 day plan (with acceptance criteria)

### Day 1 — Foundations
- [ ] Next.js + TS scaffold; Prisma schema migrated; pgvector enabled
- [ ] Auth wired; org/tenant creation; 3 roles (ADMIN/AGENT/CUSTOMER)
- [ ] `getTenantDb()` scoped data-access layer; `rbac()` route guard
- [ ] Ticket CRUD + list/detail UI
- **Done when:** two separate tenants exist; a CUSTOMER cannot see another tenant's tickets; an
  AGENT can open and reply to a ticket.

### Day 2 — Real-time + jobs + the agent
- [ ] Real-time ticket/message updates (WS/SSE) + presence indicator
- [ ] Ingestion job: upload doc → chunk → embed → pgvector (status PENDING→INDEXED)
- [ ] Reply agent: retrieve (hybrid) → draft with **citations** → self-critique → PENDING suggestion
- [ ] Human-in-the-loop: agent can Accept / Edit / Reject a suggestion; AuditLog records it
- [ ] Auto-triage on `ticket.created` (tags + priority + routing)
- [ ] Token-bucket rate limiter on `/api/widget`
- **Done when:** uploading a KB doc then asking a question produces a cited draft an agent can send;
  hammering the widget endpoint returns 429 after the limit.

### Day 3 — AI Ops + governance + ship
- [ ] `eval/golden.jsonl` (~30–50 Q/A) + scorer → faithfulness + retrieval-hit report
- [ ] CI: GitHub Actions runs lint + unit + e2e + **eval gate (fail if faithfulness < 0.85)**
- [ ] `/metrics` page: cost over time, p95 latency, acceptance rate, refusal rate
- [ ] Governance: PII redaction on ingest + logs; injection guard; refusal/escalation policy;
      tenant-isolation test (tenant A cannot read tenant B)
- [ ] AI client hardening: timeout + retry + fallback + per-tenant monthly cost cap
- [ ] Docs: README (case study), ARCHITECTURE diagram, MODEL_CARD, DATASHEET, THREAT_MODEL, 1–2 ADRs
- [ ] **Deploy live**; record a 3-min Loom walkthrough
- **Done when:** the live URL works end-to-end, CI is green, and the eval report shows a real number.

### Cut-if-short (label these "v2" in the README, don't apologize for them)
Stripe billing · live cursors · multi-region · SSO · fine-grained per-document ACLs.

---

## 8. AI Operations — make the numbers real

- **Eval:** `golden.jsonl` rows of `{question, mustContainFacts[], mustCite: bool}`. Scorer runs the
  agent over a fixed mini-corpus and computes **faithfulness** (LLM-as-judge or RAGAS-style) and
  **retrieval hit-rate**. Emits `eval/report.md`.
- **CI gate:** the GitHub Action fails the build if faithfulness drops below threshold. *This is rare
  in portfolios and a massive "thinks in production" signal.*
- **Observability:** every `AiSuggestion` stores tokens/cost/latency; `/metrics` charts them. Optional:
  wire Langfuse for traces.

## 9. Governance & Documentation — the part nobody else does

- **Tenant isolation** enforced centrally + an automated test that proves it.
- **PII redaction** on ingestion and in logs; **prompt-injection guard** on ingested content + input.
- **Audit log** of every AI suggestion and every sensitive action (role change, data export).
- **Refusal policy:** the agent refuses/escalates on low retrieval confidence or out-of-scope queries
  — and logs it.
- **Written artifacts** (your "Documentation" competency, and the easiest place to outclass everyone):
  - `MODEL_CARD.md` — model used, intended use, limitations, eval scores
  - `DATASHEET.md` — corpus provenance, licensing, refresh cadence
  - `THREAT_MODEL.md` — injection, data exfiltration, cross-tenant bleed + mitigations
  - `docs/adr/*` — architecture decision records (why pgvector, why human-in-the-loop, etc.)

---

## 10. README = mini case study (structure)

1. **Problem** (1 paragraph) + a 3-min Loom link
2. **Live demo** URL + test credentials
3. **Architecture diagram** + key decisions (link ADRs)
4. **The five areas** — the table from §2, so reviewers see the breadth instantly
5. **Results / numbers** — faithfulness score, p95 latency, "load-tested to N req/s"
6. **Run locally** — one-command setup (`docker compose up` or `pnpm dev`)

---

## 11. Resume bullets + interview talking points

**Resume line:**
> Built & deployed a multi-tenant AI support platform (Next.js/TS, Postgres, pgvector) — role-based
> access, real-time ticketing over WebSockets, a background ingestion queue, token-bucket rate
> limiting, and a RAG reply agent with human-in-the-loop; CI/CD via GitHub Actions, e2e-tested with
> Playwright, eval-gated (faithfulness 0.9+).

**Per-area talking points (have one story each):**
- *Agentic:* "The agent self-critiques and escalates instead of guessing — here's the control flow and why."
- *RAG:* "Hybrid retrieval + rerank beat pure vector by X on my eval; here's the chunking decision."
- *AI Ops:* "CI fails if faithfulness regresses — let me show the gate and the metrics page."
- *Automation:* "Ingestion, triage, and digests are all async jobs; here's the queue + idempotency."
- *Governance:* "Tenant isolation is enforced here and proven by this test; every AI suggestion is audited."

---

## 12. Next step

Scaffold the repo (Next.js + Prisma schema + the `lib/` skeleton + CI file + docs stubs) so Day 1 is
mostly filling in blanks. Say the word and it gets generated.
