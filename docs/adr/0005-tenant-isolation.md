# 0005 — Tenant isolation via a Prisma client extension

Status: Accepted

## Context
Multi-tenant data must never leak across tenants, and the guarantee shouldn't depend on every call site
remembering to filter by `tenantId`.

## Decision
`getTenantDb(tenantId)` returns a Prisma client extended with `$extends({ query: { $allModels: … } })`
that injects `tenantId` into the `where` of every read/update/delete on tenant-scoped models (leveraging
extended-unique-where). Creates pass `tenantId` explicitly (type-enforced). Isolation is enforced in
**one place** and proven by `tests/integration/tenant-isolation.test.ts`.

## Consequences
- A single, auditable choke point for isolation; call sites can't forget it.
- Creates are explicit (TypeScript requires `tenantId`), which is also clearer intent.
- Raw SQL (pgvector queries) bypasses the extension, so those queries filter by `tenantId` explicitly.
