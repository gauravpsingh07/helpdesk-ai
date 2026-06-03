/**
 * Reciprocal Rank Fusion — combine several ranked lists of ids into one score
 * map. Robust to differing score scales because it uses rank, not raw score.
 * score(id) = Σ 1 / (k + rank). Higher is better.
 */
export function reciprocalRankFusion(rankedLists: string[][], k = 60): Map<string, number> {
  const scores = new Map<string, number>();
  for (const list of rankedLists) {
    list.forEach((id, index) => {
      scores.set(id, (scores.get(id) ?? 0) + 1 / (k + index + 1));
    });
  }
  return scores;
}
