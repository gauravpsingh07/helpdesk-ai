// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db/client';
import { getTenantDb } from '@/lib/db/tenant';

const SUFFIX = `iso_${Date.now()}`;

describe('tenant isolation', () => {
  let tenantA = '';
  let tenantB = '';
  let docBId = '';

  beforeAll(async () => {
    const a = await prisma.tenant.create({ data: { name: 'Iso A', slug: `a_${SUFFIX}` } });
    const b = await prisma.tenant.create({ data: { name: 'Iso B', slug: `b_${SUFFIX}` } });
    tenantA = a.id;
    tenantB = b.id;
    await prisma.document.create({ data: { tenantId: a.id, title: 'A doc' } });
    const docB = await prisma.document.create({ data: { tenantId: b.id, title: 'B doc' } });
    docBId = docB.id;
  });

  afterAll(async () => {
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
    await prisma.$disconnect();
  });

  it('findMany only returns the active tenant rows', async () => {
    const docs = await getTenantDb(tenantA).document.findMany();
    expect(docs).toHaveLength(1);
    expect(docs[0]?.title).toBe('A doc');
  });

  it('cannot read another tenant row even by id', async () => {
    const leaked = await getTenantDb(tenantA).document.findFirst({ where: { id: docBId } });
    expect(leaked).toBeNull();
  });

  it('auto-stamps tenantId on create', async () => {
    // tenantId is injected by getTenantDb, so it is intentionally omitted here.
    // @ts-expect-error tenantId supplied by the tenant-scope extension
    const created = await getTenantDb(tenantA).document.create({ data: { title: 'scoped' } });
    expect(created.tenantId).toBe(tenantA);
  });
});
