import type { NextRequest } from 'next/server';
import { processBatch } from '@/lib/jobs/run';

export const dynamic = 'force-dynamic';

// Secured by a shared secret. Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`;
// a local worker/curl can send `x-jobs-secret`. If no secret is configured, allow (dev).
function authorized(req: NextRequest): boolean {
  const secret = process.env.JOBS_RUN_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return true;
  return (
    req.headers.get('authorization') === `Bearer ${secret}` ||
    req.headers.get('x-jobs-secret') === secret
  );
}

async function handle(req: NextRequest): Promise<Response> {
  if (!authorized(req)) return new Response('Unauthorized', { status: 401 });
  const result = await processBatch(20);
  return Response.json(result);
}

export const GET = handle;
export const POST = handle;
