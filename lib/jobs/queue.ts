import { prisma } from '@/lib/db/client';
import { Prisma } from '@/lib/generated/prisma/client';
import { backoffSeconds } from './backoff';

export type JobType = 'document.ingest' | 'ticket.triage' | 'digest.daily';

export type ClaimedJob = {
  id: string;
  type: string;
  payload: unknown;
  attempts: number;
  maxAttempts: number;
};

export async function enqueue(
  type: JobType,
  payload: Record<string, unknown>,
  opts?: { runAt?: Date; maxAttempts?: number },
): Promise<string> {
  const job = await prisma.job.create({
    data: {
      type,
      payload: payload as Prisma.InputJsonValue,
      runAt: opts?.runAt ?? new Date(),
      maxAttempts: opts?.maxAttempts ?? 3,
    },
  });
  return job.id;
}

/**
 * Atomically claim due jobs. `FOR UPDATE SKIP LOCKED` lets multiple workers poll
 * concurrently without ever handing the same job to two of them.
 */
export async function claimDueJobs(limit: number): Promise<ClaimedJob[]> {
  return prisma.$queryRaw<ClaimedJob[]>`
    UPDATE "Job"
    SET status = 'RUNNING', attempts = attempts + 1, "updatedAt" = now()
    WHERE id IN (
      SELECT id FROM "Job"
      WHERE status = 'PENDING' AND "runAt" <= now()
      ORDER BY "runAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit}
    )
    RETURNING id, type, payload, attempts, "maxAttempts"
  `;
}

export async function completeJob(id: string): Promise<void> {
  await prisma.job.update({ where: { id }, data: { status: 'COMPLETED', lastError: null } });
}

/** Mark failed: reschedule with backoff while attempts remain, else give up. */
export async function failJob(
  id: string,
  attempts: number,
  maxAttempts: number,
  error: string,
): Promise<void> {
  if (attempts >= maxAttempts) {
    await prisma.job.update({
      where: { id },
      data: { status: 'FAILED', lastError: error.slice(0, 500) },
    });
    return;
  }
  await prisma.job.update({
    where: { id },
    data: {
      status: 'PENDING',
      runAt: new Date(Date.now() + backoffSeconds(attempts) * 1000),
      lastError: error.slice(0, 500),
    },
  });
}
