import { prisma } from '@/lib/db/client';

/** A cap of <= 0 means "unlimited" (disabled). Otherwise block at/over the cap. */
export function isCapExceeded(monthToDateUsd: number, capUsd: number): boolean {
  if (capUsd <= 0) return false;
  return monthToDateUsd >= capUsd;
}

export async function tenantMonthToDateCostUsd(tenantId: string): Promise<number> {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const agg = await prisma.aiSuggestion.aggregate({
    where: { tenantId, createdAt: { gte: start } },
    _sum: { costUsd: true },
  });
  return agg._sum.costUsd ?? 0;
}

export type CostCapStatus = { allowed: boolean; monthToDateUsd: number; capUsd: number };

export async function checkCostCap(tenantId: string): Promise<CostCapStatus> {
  const capUsd = Number(process.env.AI_MONTHLY_COST_CAP_USD ?? '0');
  const monthToDateUsd = await tenantMonthToDateCostUsd(tenantId);
  return { allowed: !isCapExceeded(monthToDateUsd, capUsd), monthToDateUsd, capUsd };
}
