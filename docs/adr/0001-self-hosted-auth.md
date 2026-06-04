# 0001 — Self-hosted auth with Auth.js (not Clerk)

Status: Accepted

## Context
Needed multi-tenant auth with roles. Clerk is fast but is a third-party account/service; the project
goal is $0, no external accounts, and demonstrable engineering.

## Decision
Use **Auth.js v5** with a Credentials provider and **JWT sessions** on our own Postgres. The JWT carries
`tenantId` and `role`; `middleware.ts` gates routes; server actions/pages re-check via
`requireActor`/`requireRole` (defense in depth). Passwords hashed with bcrypt.

## Consequences
- No external identity dependency; full control of the user model and RBAC (a stronger interview signal).
- We own more surface (sessions, hashing) — mitigated by Auth.js handling the hard parts.
- Email is globally unique (one user → one tenant), which keeps login simple for this app.
