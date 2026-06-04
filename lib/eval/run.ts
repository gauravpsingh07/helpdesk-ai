import { prisma } from '@/lib/db/client';
import { ingestDocument } from '@/lib/rag/ingest';
import { retrieve } from '@/lib/rag/retrieve';
import { generateText } from '@/lib/ai/gemini';
import { scoreFaithfulness } from '@/lib/ai/grade';
import { CASES, CORPUS } from './golden';
import { keywordRecall, mean, retrievalHit } from './scorer';

export type EvalCaseResult = {
  question: string;
  faithfulness: number;
  recall: number;
  retrievalHit: boolean;
  refused: boolean;
};

export type EvalReport = {
  n: number;
  avgFaithfulness: number;
  avgRecall: number;
  retrievalHitRate: number;
  cases: EvalCaseResult[];
};

const ANSWER_SYSTEM =
  'You are a careful customer-support agent. Answer ONLY using the numbered context. ' +
  'Cite sources inline like [1], [2]. If the context does not contain the answer, say you are not sure.';

/**
 * Run the golden set against the real pipeline (ingest → retrieve → generate →
 * grade) in an ephemeral tenant, then tear it down. Returns aggregate metrics.
 */
export async function runEval(): Promise<EvalReport> {
  const tenant = await prisma.tenant.create({
    data: { name: 'Eval', slug: `eval_${Date.now()}` },
  });

  try {
    for (const doc of CORPUS) {
      const created = await prisma.document.create({
        data: { tenantId: tenant.id, title: doc.title, status: 'PENDING' },
      });
      await ingestDocument(tenant.id, created.id, doc.content);
    }

    const cases: EvalCaseResult[] = [];
    for (const testCase of CASES) {
      const chunks = await retrieve(tenant.id, testCase.question, 5);
      const hit = retrievalHit(
        chunks.map((c) => c.documentTitle),
        testCase.expectDocTitle,
      );

      if (chunks.length === 0) {
        cases.push({
          question: testCase.question,
          faithfulness: 0,
          recall: 0,
          retrievalHit: hit,
          refused: true,
        });
        continue;
      }

      const context = chunks
        .map((c, i) => `[${i + 1}] (${c.documentTitle})\n${c.content}`)
        .join('\n\n');
      const gen = await generateText({
        system: ANSWER_SYSTEM,
        prompt: `Context:\n${context}\n\nQuestion: ${testCase.question}\n\nAnswer, citing the context.`,
        temperature: 0.2,
      });
      const faithfulness = await scoreFaithfulness(context, gen.text);
      const recall = keywordRecall(gen.text, testCase.expectContains);
      cases.push({
        question: testCase.question,
        faithfulness,
        recall,
        retrievalHit: hit,
        refused: false,
      });
    }

    return {
      n: cases.length,
      avgFaithfulness: mean(cases.map((c) => c.faithfulness)),
      avgRecall: mean(cases.map((c) => c.recall)),
      retrievalHitRate: mean(cases.map((c) => (c.retrievalHit ? 1 : 0))),
      cases,
    };
  } finally {
    await prisma.tenant.deleteMany({ where: { id: tenant.id } });
  }
}
