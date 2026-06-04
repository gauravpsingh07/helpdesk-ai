# Threat Model

Scope: the multi-tenant SaaS, its AI pipeline, and the public widget. Format: asset → threat →
mitigation (with where it lives in code).

## Assets
Tenant data (tickets, KB, users) · auth secrets (`AUTH_SECRET`, DB URL, API keys) · the AI budget.

## Threats & mitigations

| Threat | Mitigation | Where |
| --- | --- | --- |
| **Cross-tenant data access** | Every read/update/delete is auto-scoped to `tenantId` via a Prisma `$extends`; creates require explicit `tenantId`. Proven by an isolation test. | `lib/db/tenant.ts`, `tests/integration/tenant-isolation.test.ts` |
| **Prompt injection** (poisoned KB doc or message hijacking the agent) | Retrieved content is injection-sanitized before it enters the prompt; the system prompt constrains the model to the provided context; the agent refuses when unsupported. | `lib/governance/injection.ts`, `lib/agent/replyAgent.ts` |
| **PII leakage** into the vector store / model | PII is redacted at ingestion before chunk/embed/store. | `lib/governance/pii.ts`, `lib/rag/ingest.ts` |
| **Secret exposure** | `.env` is git-ignored (`!.env.example` ships empty placeholders); a pre-push audit confirmed no secret is tracked; JWT secret + DB URL are env-only. | `.gitignore`, `.env.example` |
| **Auth bypass / privilege escalation** | Auth.js sessions (JWT) + `middleware.ts` route gating + server-side `requireActor`/`requireRole`; RBAC enforced on actions and pages (defense in depth). | `auth.ts`, `middleware.ts`, `lib/auth/*` |
| **Public widget abuse** (spam, brute force) | API keys are SHA-256 hashed at rest; a per-key token-bucket rate limiter returns 429 + `Retry-After`. | `lib/apikey.ts`, `lib/ratelimit/tokenBucket.ts`, `app/api/widget` |
| **Runaway AI cost** | Per-tenant monthly cost cap blocks generation over budget (escalates to a human instead). | `lib/governance/costCap.ts` |
| **Unsafe / out-of-scope requests** | Restricted-topic policy → refuse + escalate. | `lib/governance/policy.ts` |
| **Untrusted job input** | Jobs are claimed atomically (`FOR UPDATE SKIP LOCKED`), retried with backoff, and capped attempts; the run endpoint is secret-gated. | `lib/jobs/*`, `app/api/jobs/run` |
| **Tampered audit trail** | Append-only `AuditLog` for sensitive + AI actions. | `lib/audit.ts` |

## Residual risks / future work
- PII redaction and injection detection are **heuristics** — add an ML-based PII/NER pass and an
  allow-list output filter for higher assurance.
- SSE uses an in-process bus (single instance); fan-out (Redis/Pusher) needed to scale horizontally.
- Rate limiting is in-memory; move to Redis for multi-instance correctness.
- No CSRF token on the public widget beyond the API key; add origin checks for browser embeds.
