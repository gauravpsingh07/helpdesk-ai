// @vitest-environment node
import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db/client';
import { claimDueJobs, completeJob, enqueue } from '@/lib/jobs/queue';

describe('job queue', () => {
  const created: string[] = [];

  afterAll(async () => {
    await prisma.job.deleteMany({ where: { id: { in: created } } });
    await prisma.$disconnect();
  });

  it('enqueues, atomically claims, and completes a job', async () => {
    const id = await enqueue('digest.daily', { test: true });
    created.push(id);

    const claimed = await claimDueJobs(20);
    const mine = claimed.find((j) => j.id === id);
    expect(mine).toBeTruthy();
    expect(mine?.attempts).toBe(1);

    // A second claim must not return an already-RUNNING job.
    const again = await claimDueJobs(20);
    expect(again.find((j) => j.id === id)).toBeUndefined();

    await completeJob(id);
    const after = await prisma.job.findUnique({ where: { id } });
    expect(after?.status).toBe('COMPLETED');
  });
});
