# 3-minute walkthrough script (for a Loom recording)

Goal: show it's a real product **and** a real engineering project. Have `pnpm dev` + `pnpm worker`
running, logged out, with the demo data seeded.

**0:00 — Hook (15s)**
"This is a multi-tenant AI support platform. Companies get a helpdesk where an AI agent drafts replies
grounded in their own docs — but a human always approves. Everything's $0 to run and CI-gated. Let me
show you."

**0:15 — Auth + multi-tenancy (30s)**
- Sign in as `admin@acme.test`. Land on the dashboard.
- "Auth is self-hosted (Auth.js + JWT), role-aware. Two orgs, Acme and Globex, are fully isolated —
  that isolation is enforced in one Prisma extension and proven by a test."

**0:45 — Tickets + real-time (25s)**
- Open a ticket; post a reply — show it appear live (SSE).

**1:10 — Knowledge base + RAG (30s)**
- Go to Knowledge base, paste a short doc, "Add & index" (worker indexes it async).
- Use "Test retrieval" to search it — show the cited chunks with scores. "Hybrid search: vector +
  full-text, fused with RRF."

**1:40 — The agent (40s)**
- On a ticket, click **Draft AI reply**. Show the draft, the **faithfulness %**, and the cited sources.
- "The agent retrieves, drafts only from context with citations, then self-critiques faithfulness and
  refuses + escalates if it's not grounded — no hallucinated answers." Accept it → posts as the reply.

**2:20 — AI Ops + governance (25s)**
- Open **AI metrics**: acceptance rate, refusal rate, p95 latency, cost, faithfulness.
- "There's an eval that runs the golden set and fails CI if faithfulness regresses. Plus PII redaction,
  prompt-injection defense, and a per-tenant cost cap."

**2:45 — Close (15s)**
- Show the green CI badge + the repo. "Next.js, Postgres+pgvector, Prisma, Gemini. 12 phases, ~60
  atomic commits, full test suite. Code and a live demo are linked below."
