import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { prisma } from '@/lib/db/client';
import { runEval, type EvalReport } from '@/lib/eval/run';

const THRESHOLD = Number(process.env.EVAL_FAITHFULNESS_MIN ?? '0.7');

function renderMarkdown(report: EvalReport, threshold: number): string {
  const pct = (n: number) => `${(n * 100).toFixed(0)}%`;
  const rows = report.cases
    .map(
      (c) =>
        `| ${c.question} | ${pct(c.faithfulness)} | ${pct(c.recall)} | ${c.retrievalHit ? '✅' : '❌'} | ${c.refused ? 'yes' : 'no'} |`,
    )
    .join('\n');
  return [
    '# RAG / Agent Evaluation Report',
    '',
    `- Cases: **${report.n}**`,
    `- Avg faithfulness: **${pct(report.avgFaithfulness)}** (gate ≥ ${pct(threshold)})`,
    `- Avg keyword recall: **${pct(report.avgRecall)}**`,
    `- Retrieval hit-rate: **${pct(report.retrievalHitRate)}**`,
    '',
    '| Question | Faithfulness | Recall | Retrieval hit | Refused |',
    '| --- | --- | --- | --- | --- |',
    rows,
    '',
  ].join('\n');
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.log('eval: GEMINI_API_KEY not set — skipping (no gate).');
    return;
  }

  const report = await runEval();
  mkdirSync('eval', { recursive: true });
  writeFileSync('eval/report.json', JSON.stringify(report, null, 2));
  const md = renderMarkdown(report, THRESHOLD);
  writeFileSync('eval/report.md', md);
  console.log(md);

  if (report.avgFaithfulness < THRESHOLD) {
    console.error(
      `\n❌ eval FAILED: faithfulness ${report.avgFaithfulness.toFixed(2)} < threshold ${THRESHOLD}`,
    );
    process.exitCode = 1;
    return;
  }
  console.log(`\n✅ eval PASSED: faithfulness ${report.avgFaithfulness.toFixed(2)} ≥ ${THRESHOLD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
