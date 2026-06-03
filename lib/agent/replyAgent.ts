import { prisma } from '@/lib/db/client';
import { Prisma } from '@/lib/generated/prisma/client';
import { getTenantDb } from '@/lib/db/tenant';
import { generateText } from '@/lib/ai/gemini';
import { estimateCostUsd } from '@/lib/ai/cost';
import { retrieve } from '@/lib/rag/retrieve';

const FAITHFULNESS_REFUSE_BELOW = 0.5;
const GRADER_MODEL = process.env.GEMINI_GRADER_MODEL ?? 'gemini-2.5-flash-lite';

export type Citation = { n: number; documentTitle: string; chunkId: string };
export type ReplyResult = { suggestionId: string; refused: boolean; faithfulness: number };

function lastCustomerQuestion(messages: { sender: string; body: string }[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.sender === 'CUSTOMER') return messages[i]?.body ?? null;
  }
  return null;
}

// Self-critique step: LLM-as-judge faithfulness of the draft against the context.
async function scoreFaithfulness(context: string, answer: string): Promise<number> {
  const system =
    'You are a strict grader. Given CONTEXT and an ANSWER, output JSON {"faithful": n} where ' +
    'n in [0,1] is how fully the ANSWER is supported by the CONTEXT alone. No prose.';
  try {
    const res = await generateText({
      system,
      prompt: `CONTEXT:\n${context}\n\nANSWER:\n${answer}\n\nReturn JSON only.`,
      json: true,
      temperature: 0,
      model: GRADER_MODEL,
    });
    const parsed = JSON.parse(res.text) as { faithful?: unknown };
    const value = Number(parsed.faithful);
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.5;
  } catch {
    return 0.5;
  }
}

/**
 * Reply agent state machine:
 *   gather question → retrieve → (refuse if no grounding) → draft w/ citations
 *   → self-critique faithfulness → (refuse if low) → persist PENDING suggestion.
 */
export async function runReplyAgent(tenantId: string, ticketId: string): Promise<ReplyResult> {
  const started = Date.now();
  const db = getTenantDb(tenantId);
  const ticket = await db.ticket.findFirst({
    where: { id: ticketId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (!ticket) throw new Error('Ticket not found');

  const question = lastCustomerQuestion(ticket.messages) ?? ticket.subject;
  const chunks = await retrieve(tenantId, question, 5);

  if (chunks.length === 0) {
    return persist({
      tenantId,
      ticketId,
      draft:
        "I couldn't find anything in the knowledge base to answer this confidently, so I'm escalating to a human agent.",
      citations: [],
      faithfulness: 0,
      refused: true,
      model: GRADER_MODEL,
      promptTokens: 0,
      completionTokens: 0,
      costUsd: 0,
      latencyMs: Date.now() - started,
    });
  }

  const context = chunks
    .map((c, i) => `[${i + 1}] (${c.documentTitle})\n${c.content}`)
    .join('\n\n');
  const system =
    'You are a careful customer-support agent. Answer ONLY using the numbered context. ' +
    'Cite sources inline like [1], [2]. If the context does not contain the answer, say you are ' +
    'not sure and will escalate. Be concise and friendly.';
  const gen = await generateText({
    system,
    prompt: `Context:\n${context}\n\nCustomer question: ${question}\n\nWrite the reply, citing the context.`,
    temperature: 0.2,
  });

  const faithfulness = await scoreFaithfulness(context, gen.text);
  const refused = faithfulness < FAITHFULNESS_REFUSE_BELOW;
  const citations: Citation[] = chunks.map((c, i) => ({
    n: i + 1,
    documentTitle: c.documentTitle,
    chunkId: c.id,
  }));

  return persist({
    tenantId,
    ticketId,
    draft: refused
      ? "I'm not confident the knowledge base fully answers this, so I'm escalating to a human agent."
      : gen.text,
    citations,
    faithfulness,
    refused,
    model: gen.model,
    promptTokens: gen.promptTokens,
    completionTokens: gen.completionTokens,
    costUsd: estimateCostUsd(gen.model, gen.promptTokens, gen.completionTokens),
    latencyMs: Date.now() - started,
  });
}

async function persist(args: {
  tenantId: string;
  ticketId: string;
  draft: string;
  citations: Citation[];
  faithfulness: number;
  refused: boolean;
  model: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  latencyMs: number;
}): Promise<ReplyResult> {
  const suggestion = await prisma.aiSuggestion.create({
    data: {
      tenantId: args.tenantId,
      ticketId: args.ticketId,
      draft: args.draft,
      citations: args.citations as unknown as Prisma.InputJsonValue,
      faithfulness: args.faithfulness,
      refused: args.refused,
      model: args.model,
      promptTokens: args.promptTokens,
      completionTokens: args.completionTokens,
      costUsd: args.costUsd,
      latencyMs: args.latencyMs,
      status: 'PENDING',
    },
  });
  return { suggestionId: suggestion.id, refused: args.refused, faithfulness: args.faithfulness };
}
