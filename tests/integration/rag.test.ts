// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db/client';
import { ingestDocument } from '@/lib/rag/ingest';
import { retrieve } from '@/lib/rag/retrieve';

// Hits the real Gemini embedding API — skipped automatically when no key is set
// (e.g. CI without the secret), so the suite stays green either way.
const SUFFIX = `rag_${Date.now()}`;
const CONTENT = `Refund policy.

Customers may request a refund within 30 days of purchase. Refunds are processed back to the
original payment method within 5 business days. Shipping fees are non-refundable.

To start a refund, contact support with your order number and reason.`;

describe.skipIf(!process.env.GEMINI_API_KEY)('RAG pipeline (ingest + retrieve)', () => {
  let tenantId = '';
  let docId = '';

  beforeAll(async () => {
    const tenant = await prisma.tenant.create({ data: { name: 'RAG Test', slug: SUFFIX } });
    tenantId = tenant.id;
    const doc = await prisma.document.create({
      data: { tenantId, title: 'Refund policy', status: 'PENDING' },
    });
    docId = doc.id;
  });

  afterAll(async () => {
    await prisma.tenant.deleteMany({ where: { id: tenantId } });
    await prisma.$disconnect();
  });

  it('ingests a document into embedded chunks and marks it INDEXED', async () => {
    const { chunks } = await ingestDocument(tenantId, docId, CONTENT);
    expect(chunks).toBeGreaterThan(0);

    const stored = await prisma.chunk.count({ where: { tenantId, documentId: docId } });
    expect(stored).toBe(chunks);

    const doc = await prisma.document.findUnique({ where: { id: docId } });
    expect(doc?.status).toBe('INDEXED');
  });

  it('retrieves relevant chunks for a natural-language query', async () => {
    const results = await retrieve(tenantId, 'How long do I have to ask for my money back?', 3);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.documentTitle).toBe('Refund policy');
    expect(results[0]?.content.toLowerCase()).toContain('refund');
  });
});
