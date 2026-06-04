# 0004 — Google Gemini free tier for AI (not Claude/OpenAI)

Status: Accepted

## Context
Need embeddings + generation at $0 with no credit card. Anthropic/OpenAI are pay-as-you-go.

## Decision
Use **Google Gemini's free tier**: `gemini-embedding-001` (768-d) for embeddings, `gemini-2.5-flash`
for drafting, `gemini-2.5-flash-lite` for triage + the faithfulness grader. Access via a thin REST
client (`lib/ai/gemini.ts`) with timeout/retry and token accounting — **no SDK**, so the surface is
small and provider-agnostic (swap for Ollama/OpenAI behind the same `embedTexts`/`generateText`).

## Consequences
- $0, no card; embeddings are 768-d to match the `vector(768)` column.
- Free-tier rate limits (handled by retry) and possible prompt-for-training (fine for synthetic demo
  data; use a paid tier for sensitive data — see datasheet).
- `text-embedding-004` is retired; standardized on `gemini-embedding-001`.
