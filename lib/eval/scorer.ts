/** Fraction of expected keywords present in `text` (case-insensitive). */
export function keywordRecall(text: string, keywords: string[]): number {
  if (keywords.length === 0) return 1;
  const haystack = text.toLowerCase();
  const hits = keywords.filter((k) => haystack.includes(k.toLowerCase())).length;
  return hits / keywords.length;
}

/** Did retrieval surface the document we expected? */
export function retrievalHit(retrievedTitles: string[], expectedTitle: string): boolean {
  return retrievedTitles.includes(expectedTitle);
}

export function mean(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}
