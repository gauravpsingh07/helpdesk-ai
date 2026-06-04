# 0002 — Real-time via SSE (not Pusher)

Status: Accepted

## Context
Ticket threads need live updates. Pusher/Ably are easy but require an account + keys.

## Decision
Use **Server-Sent Events** from a Next route handler (`/api/stream/:ticketId`) backed by an in-process
pub/sub (`lib/realtime.ts`). The client subscribes with `EventSource`; server actions publish on
message/status/assignee changes.

## Consequences
- Zero external services; works locally and on a single instance.
- In-process bus does not fan out across instances — horizontal scale needs Redis/Pusher pub/sub (noted
  in the threat model / future work).
- E2E asserts persistence via reload rather than the live event (real-time timing is non-deterministic
  in headless CI).
