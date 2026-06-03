import { prisma } from '@/lib/db/client';

export type ChunkInput = { content: string; tokenCount: number; embedding: number[] };

const toVectorLiteral = (embedding: number[]) => `[${embedding.join(',')}]`;

/**
 * Replace all chunks for a document in a single transaction. Embeddings are
 * written via raw SQL because Prisma can't express the pgvector `vector` type.
 */
export async function replaceDocumentChunks(
  tenantId: string,
  documentId: string,
  chunks: ChunkInput[],
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.chunk.deleteMany({ where: { tenantId, documentId } });
    for (const chunk of chunks) {
      await tx.$executeRaw`
        INSERT INTO "Chunk" (id, "tenantId", "documentId", content, "tokenCount", embedding, "createdAt")
        VALUES (gen_random_uuid()::text, ${tenantId}, ${documentId}, ${chunk.content}, ${chunk.tokenCount}, ${toVectorLiteral(chunk.embedding)}::vector, now())
      `;
    }
  });
}
