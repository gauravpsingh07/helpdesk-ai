import 'dotenv/config';
import { processBatch } from '@/lib/jobs/run';

const INTERVAL_MS = Number(process.env.WORKER_INTERVAL_MS ?? '3000');
let running = true;

const stop = () => {
  running = false;
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

async function loop() {
  console.log(`[worker] started — polling every ${INTERVAL_MS}ms`);
  while (running) {
    try {
      const { processed, failed } = await processBatch(10);
      if (processed || failed) console.log(`[worker] processed=${processed} failed=${failed}`);
    } catch (err) {
      console.error('[worker] batch error:', err);
    }
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }
  console.log('[worker] stopped');
  process.exit(0);
}

void loop();
