import { prisma } from '@/lib/db/client';
import { embedOne } from '@/lib/ai/gemini';
import { reciprocalRankFusion } from './rrf';

export type RetrievedChunk = {
  id: string;
  content: string;
  documentId: string;
  documentTitle: string;
  score: number;
};

type Row = {
  id: string;
  content: string;
  documentId: string;
  documentTitle: string;
};

/**
 * Hybrid retrieval: pgvector cosine similarity + Postgres full-text search,
 * fused with Reciprocal Rank Fusion so neither signal dominates.
 */
export async function retrieve(
  tenantId: string,
  query: string,
  topK = 5,
): Promise<RetrievedChunk[]> {
  const embedding = await embedOne(query);
  const vectorLiteral = `[${embedding.join(',')}]`;
  const pool = topK * 3;

  const vectorRows = await prisma.$queryRaw<Row[]>`
    SELECT c.id, c.content, c."documentId", d.title AS "documentTitle"
    FROM "Chunk" c
    JOIN "Document" d ON d.id = c."documentId"
    WHERE c."tenantId" = ${tenantId} AND c.embedding IS NOT NULL
    ORDER BY c.embedding <=> ${vectorLiteral}::vector
    LIMIT ${pool}
  `;

  const keywordRows = await prisma.$queryRaw<Row[]>`
    SELECT c.id, c.content, c."documentId", d.title AS "documentTitle"
    FROM "Chunk" c
    JOIN "Document" d ON d.id = c."documentId"
    WHERE c."tenantId" = ${tenantId}
      AND to_tsvector('english', c.content) @@ plainto_tsquery('english', ${query})
    ORDER BY ts_rank(to_tsvector('english', c.content), plainto_tsquery('english', ${query})) DESC
    LIMIT ${pool}
  `;

  const byId = new Map<string, Row>();
  for (const row of [...vectorRows, ...keywordRows]) byId.set(row.id, row);

  const fused = reciprocalRankFusion([vectorRows.map((r) => r.id), keywordRows.map((r) => r.id)]);

  return [...fused.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK)
    .map(([id, score]) => {
      const row = byId.get(id) as Row;
      return { ...row, score };
    });
}
