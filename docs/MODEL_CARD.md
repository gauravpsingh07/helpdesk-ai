# Model Card — Helpdesk AI reply & triage agents

## Overview
The system uses hosted Google Gemini models to (a) draft customer-support replies grounded in a
tenant's knowledge base and (b) triage incoming tickets. It is **assistive**: every AI reply is
reviewed by a human (accept / edit / reject) before it reaches a customer.

## Models
| Role | Model | Notes |
| --- | --- | --- |
| Embeddings | `gemini-embedding-001` (`outputDimensionality: 768`) | matches the `vector(768)` column |
| Reply drafting | `gemini-2.5-flash` | grounded generation with inline citations |
| Triage + faithfulness grader | `gemini-2.5-flash-lite` | classification + LLM-as-judge scoring |

Provider calls go through a thin client (`lib/ai/gemini.ts`) with timeout, retry/backoff, and token
accounting. The interface is provider-agnostic (swappable for Ollama/OpenAI).

## Intended use
- Draft grounded replies an agent reviews before sending.
- Suggest tags + priority for new tickets.

## Out of scope / non-goals
- Autonomous customer-facing messaging (a human always approves).
- Legal/medical/financial advice; security-bypass or secret-disclosure requests (refused — see policy).

## How it works
Retrieve (hybrid vector + full-text) → draft using **only** retrieved context with citations →
**self-critique** the draft's faithfulness (LLM-as-judge, 0–1) → if there's no grounding or
faithfulness is low, **refuse and escalate** to a human instead of guessing.

## Evaluation
`pnpm eval` runs a golden set through the real pipeline and reports faithfulness, keyword recall, and
retrieval hit-rate; the rendered run is in [`../eval/report.md`](../eval/report.md). CI **fails** if
average faithfulness drops below the threshold (default 0.7). Latest local run: faithfulness 100%,
recall 100%, retrieval-hit 100% (small synthetic golden set — see the datasheet).

## Limitations
- Quality depends on the tenant's knowledge base; sparse/contradictory docs → more refusals.
- The faithfulness grader is itself an LLM (a useful signal, not ground truth).
- The golden set is small and synthetic; treat the headline scores as a regression guardrail, not a
  benchmark.

## Guardrails
Human-in-the-loop approval · refusal/escalation on low grounding · prompt-injection sanitization of
retrieved content · PII redaction at ingestion · per-tenant monthly cost cap · full audit log.
