// @vitest-environment node
import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db/client';
import { ingestDocument } from '@/lib/rag/ingest';

const SUFFIX = `gov_${Date.now()}`;

describe.skipIf(!process.env.GEMINI_API_KEY)('governance: PII redaction on ingest', () => {
  let tenantId = '';

  afterAll(async () => {
    await prisma.tenant.deleteMany({ where: { id: tenantId } });
    await prisma.$disconnect();
  });

  it('never stores raw PII in chunks', async () => {
    const tenant = await prisma.tenant.create({ data: { name: 'Gov', slug: SUFFIX } });
    tenantId = tenant.id;
    const doc = await prisma.document.create({
      data: { tenantId, title: 'Contact', status: 'PENDING' },
    });

    await ingestDocument(
      tenantId,
      doc.id,
      'Reach billing at billing@acme.example.com for refunds within 30 days.',
    );

    const chunks = await prisma.chunk.findMany({ where: { tenantId, documentId: doc.id } });
    const joined = chunks.map((c) => c.content).join('\n');
    expect(joined).not.toContain('billing@acme.example.com');
    expect(joined).toContain('[redacted-email]');
  });
});
