// Notional USD cost from token counts. On Gemini's free tier the real cost is
// $0, but tracking a published-rate estimate makes the AI-Ops metrics meaningful
// and keeps the per-tenant cost cap logic exercised.
const RATES_PER_MILLION: Record<string, { in: number; out: number }> = {
  'gemini-2.5-flash-lite': { in: 0.1, out: 0.4 },
  'gemini-2.5-flash': { in: 0.3, out: 2.5 },
  'gemini-2.5-pro': { in: 1.25, out: 10 },
};

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  // Match the most specific (longest) known model id contained in `model`.
  const key = Object.keys(RATES_PER_MILLION)
    .sort((a, b) => b.length - a.length)
    .find((k) => model.includes(k));
  const rate = key ? RATES_PER_MILLION[key] : { in: 0, out: 0 };
  return (inputTokens / 1_000_000) * rate.in + (outputTokens / 1_000_000) * rate.out;
}
