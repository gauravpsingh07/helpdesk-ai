import { prisma } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

// Unauthenticated liveness/readiness probe (DB connectivity). Useful for uptime
// monitors and Vercel/host health checks.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: 'ok', db: 'up', time: new Date().toISOString() });
  } catch {
    return Response.json({ status: 'degraded', db: 'down' }, { status: 503 });
  }
}
