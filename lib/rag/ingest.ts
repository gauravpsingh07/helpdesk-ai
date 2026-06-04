import { prisma } from '@/lib/db/client';
import { embedTexts } from '@/lib/ai/gemini';
import { chunkText } from './chunk';
import { replaceDocumentChunks } from './store';
import { redactPii } from '@/lib/governance/pii';

/**
 * Ingest a document: chunk → embed → store, updating the document status.
 * Called inline today; wrapped in a background job in Phase 6.
 */
export async function ingestDocument(
  tenantId: string,
  documentId: string,
  content: string,
): Promise<{ chunks: number }> {
  try {
    // Governance: strip PII before it is chunked, embedded, or surfaced to the model.
    const { text: redacted } = redactPii(content);
    const chunks = chunkText(redacted);
    if (chunks.length > 0) {
      const embeddings = await embedTexts(chunks.map((c) => c.content));
      if (embeddings.length !== chunks.length) {
        throw new Error('Embedding count does not match chunk count');
      }
      await replaceDocumentChunks(
        tenantId,
        documentId,
        chunks.map((c, i) => ({
          content: c.content,
          tokenCount: c.tokenCount,
          embedding: embeddings[i] as number[],
        })),
      );
    }
    await prisma.document.update({ where: { id: documentId }, data: { status: 'INDEXED' } });
    return { chunks: chunks.length };
  } catch (err) {
    await prisma.document.update({ where: { id: documentId }, data: { status: 'FAILED' } });
    throw err;
  }
}
