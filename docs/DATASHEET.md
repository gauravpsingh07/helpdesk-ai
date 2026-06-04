# Datasheet — data & corpora

## Tenant knowledge base (runtime)
- **What:** documents an admin/agent uploads per tenant; chunked, embedded (768-d), stored in pgvector.
- **Provenance:** customer-provided. In the demo it's synthetic seed text (refunds, shipping, billing).
- **PII:** redacted at ingestion (`lib/governance/pii.ts`) — emails, phones, SSNs, card-like numbers are
  masked **before** chunk/embed/store, so raw PII is never persisted in `Chunk` or sent to the model.
  Verified by an integration test.

## Evaluation golden set (`lib/eval/golden.ts`)
- **What:** a fixed 3-document corpus + 5 question cases with expected keywords and the expected source
  document.
- **Provenance:** hand-written, synthetic, no real PII. Intentionally small — a fast **regression
  guardrail** for the RAG/agent pipeline, not a competitive benchmark.
- **Metrics:** faithfulness (LLM-as-judge), keyword recall, retrieval hit-rate → `eval/report.md`.

## Demo seed data (`prisma/seed.ts`)
- Two tenants (`acme`, `globex`), three users each (admin/agent/customer, password `Password123!`),
  sample docs/tickets, one sample `AiSuggestion`, and a demo widget API key (`hd_demo_<slug>`).
- **Demo only.** The widget keys are intentionally guessable; never seed a real production workspace.

## Retention & isolation
- All tenant rows are isolated via `getTenantDb` (tenant-scoped Prisma extension) and cascade-delete
  with the tenant.
- Audit logs (`AuditLog`) retain who did what (AI suggestions, role changes, doc/ticket actions).

## What is sent to the model provider
Retrieved (PII-redacted, injection-sanitized) context + the customer question. No secrets, no raw PII.
On Gemini's free tier, prompts may be used by Google to improve products — acceptable for synthetic
demo data; use a paid tier / different provider for sensitive production data.
