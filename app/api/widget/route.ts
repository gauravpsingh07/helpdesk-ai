import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getTenantDb } from '@/lib/db/tenant';
import { hashApiKey } from '@/lib/apikey';
import { rateLimit } from '@/lib/ratelimit/tokenBucket';
import { widgetMessageSchema } from '@/lib/validation/ticket';
import { audit } from '@/lib/audit';

function json(body: unknown, status: number, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

export async function POST(req: NextRequest) {
  const rawKey = req.headers.get('x-api-key') ?? '';
  if (!rawKey) return json({ error: 'Missing X-API-Key header' }, 401);

  const apiKey = await prisma.apiKey.findUnique({
    where: { hashedKey: hashApiKey(rawKey) },
    include: { tenant: { select: { id: true, slug: true } } },
  });
  if (!apiKey) return json({ error: 'Invalid API key' }, 401);

  const limit = rateLimit(`widget:${apiKey.id}`, apiKey.rateLimitPerMin);
  if (!limit.allowed) {
    return json({ error: 'Rate limit exceeded' }, 429, {
      'Retry-After': String(limit.retryAfterSec),
    });
  }

  const payload = await req.json().catch(() => null);
  const parsed = widgetMessageSchema.safeParse(payload);
  if (!parsed.success) {
    return json({ error: 'Invalid payload: subject and body are required' }, 400);
  }

  const tenantId = apiKey.tenant.id;
  const visitorEmail = `widget@${apiKey.tenant.slug}.local`;
  let visitor = await prisma.user.findUnique({ where: { email: visitorEmail } });
  if (!visitor) {
    visitor = await prisma.user.create({
      data: { tenantId, email: visitorEmail, name: 'Website Visitor', role: 'CUSTOMER' },
    });
  }

  const db = getTenantDb(tenantId);
  const ticket = await db.ticket.create({
    data: { tenantId, subject: parsed.data.subject, createdById: visitor.id, tags: ['widget'] },
  });
  const intro = parsed.data.email ? `From: ${parsed.data.email}\n\n` : '';
  await db.message.create({
    data: {
      tenantId,
      ticketId: ticket.id,
      authorId: visitor.id,
      sender: 'CUSTOMER',
      body: `${intro}${parsed.data.body}`,
    },
  });
  await audit({
    tenantId,
    action: 'widget.ticket.create',
    target: ticket.id,
    metadata: { via: 'widget' },
  });
  await prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });

  return json({ ok: true, ticketId: ticket.id }, 201);
}
