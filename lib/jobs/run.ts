import { claimDueJobs, completeJob, failJob } from './queue';
import { handlers } from './handlers';

export type BatchResult = { processed: number; failed: number };

/** Claim and run up to `limit` due jobs. Safe to call concurrently. */
export async function processBatch(limit = 10): Promise<BatchResult> {
  const jobs = await claimDueJobs(limit);
  let processed = 0;
  let failed = 0;

  for (const job of jobs) {
    const handler = handlers[job.type];
    if (!handler) {
      await failJob(job.id, job.attempts, job.maxAttempts, `No handler for "${job.type}"`);
      failed += 1;
      continue;
    }
    try {
      await handler((job.payload ?? {}) as Record<string, unknown>);
      await completeJob(job.id);
      processed += 1;
    } catch (err) {
      await failJob(
        job.id,
        job.attempts,
        job.maxAttempts,
        err instanceof Error ? err.message : String(err),
      );
      failed += 1;
    }
  }

  return { processed, failed };
}
