import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/db/client';
import { hashApiKey } from '../lib/apikey';

const DEMO_PASSWORD = 'Password123!';

async function main() {
  // Dev-only reset: delete children before parents to respect RESTRICT FKs.
  await prisma.message.deleteMany();
  await prisma.aiSuggestion.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.chunk.deleteMany();
  await prisma.document.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const slug of ['acme', 'globex'] as const) {
    const name = slug === 'acme' ? 'Acme Inc.' : 'Globex Corp.';
    const tenant = await prisma.tenant.create({ data: { name, slug } });

    await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: `admin@${slug}.test`,
        name: 'Ada Admin',
        role: 'ADMIN',
        passwordHash,
      },
    });
    const agent = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: `agent@${slug}.test`,
        name: 'Gus Agent',
        role: 'AGENT',
        passwordHash,
      },
    });
    const customer = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: `customer@${slug}.test`,
        name: 'Cara Customer',
        role: 'CUSTOMER',
        passwordHash,
      },
    });

    await prisma.document.createMany({
      data: [
        { tenantId: tenant.id, title: 'Refund policy', status: 'PENDING' },
        { tenantId: tenant.id, title: 'Shipping & delivery', status: 'PENDING' },
        { tenantId: tenant.id, title: 'Account & billing FAQ', status: 'PENDING' },
      ],
    });

    const ticket = await prisma.ticket.create({
      data: {
        tenantId: tenant.id,
        subject: 'Where is my order?',
        createdById: customer.id,
        assigneeId: agent.id,
        priority: 2,
        tags: ['shipping'],
      },
    });

    await prisma.message.create({
      data: {
        tenantId: tenant.id,
        ticketId: ticket.id,
        authorId: customer.id,
        sender: 'CUSTOMER',
        body: 'I ordered 5 days ago and still have no update. Can you help?',
      },
    });

    const rawKey = `hd_demo_${slug}`;
    await prisma.apiKey.create({
      data: {
        tenantId: tenant.id,
        name: 'Demo Widget Key',
        hashedKey: hashApiKey(rawKey),
        prefix: rawKey.slice(0, 12),
        rateLimitPerMin: 30,
      },
    });

    console.log(`Seeded ${name}: users + 3 docs + 1 ticket + widget key (${rawKey})`);
  }

  console.log(`\nDemo login password for every seeded user: ${DEMO_PASSWORD}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
