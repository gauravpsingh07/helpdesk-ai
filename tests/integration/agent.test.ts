// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db/client';
import { ingestDocument } from '@/lib/rag/ingest';
import { runReplyAgent } from '@/lib/agent/replyAgent';

const SUFFIX = `agent_${Date.now()}`;
const CONTENT = `Returns and refunds.

You can return any unused item within 30 days of delivery for a full refund.
Refunds are issued to the original payment method within 5 business days.`;

describe.skipIf(!process.env.GEMINI_API_KEY)('reply agent', () => {
  let tenantId = '';
  let customerId = '';
  let groundedTicket = '';

  beforeAll(async () => {
    const tenant = await prisma.tenant.create({ data: { name: 'Agent Test', slug: SUFFIX } });
    tenantId = tenant.id;
    const customer = await prisma.user.create({
      data: { tenantId, email: `c@${SUFFIX}.test`, name: 'Cust', role: 'CUSTOMER' },
    });
    customerId = customer.id;

    const doc = await prisma.document.create({
      data: { tenantId, title: 'Returns policy', status: 'PENDING' },
    });
    await ingestDocument(tenantId, doc.id, CONTENT);

    const ticket = await prisma.ticket.create({
      data: { tenantId, subject: 'Refund question', createdById: customerId },
    });
    groundedTicket = ticket.id;
    await prisma.message.create({
      data: {
        tenantId,
        ticketId: ticket.id,
        authorId: customerId,
        sender: 'CUSTOMER',
        body: 'How many days do I have to return an item for a refund?',
      },
    });
  }, 60_000);

  afterAll(async () => {
    await prisma.tenant.deleteMany({ where: { id: tenantId } });
    await prisma.$disconnect();
  });

  it('drafts a grounded reply with citations for an answerable question', async () => {
    const result = await runReplyAgent(tenantId, groundedTicket);
    const suggestion = await prisma.aiSuggestion.findUnique({ where: { id: result.suggestionId } });

    expect(suggestion).toBeTruthy();
    expect(result.refused).toBe(false);
    expect(suggestion?.draft.toLowerCase()).toMatch(/30|thirty/);

    const citations = suggestion?.citations as unknown as { documentTitle: string }[];
    expect(citations.length).toBeGreaterThan(0);
  }, 60_000);
});
