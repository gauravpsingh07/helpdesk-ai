export type Chunk = { content: string; tokenCount: number };

const TARGET_CHARS = 1500;

// Rough token estimate (~4 chars/token) — good enough for budgeting/metadata.
const approxTokens = (s: string) => Math.ceil(s.length / 4);
const mk = (s: string): Chunk => ({ content: s.trim(), tokenCount: approxTokens(s.trim()) });

/**
 * Structure-aware chunking: greedily packs whole paragraphs up to ~TARGET_CHARS,
 * and hard-splits any single paragraph that's larger than the target.
 */
export function chunkText(input: string): Chunk[] {
  const text = input.replace(/\r\n/g, '\n').trim();
  if (!text) return [];

  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: Chunk[] = [];
  let buffer = '';

  for (const paragraph of paragraphs) {
    const combined = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
    if (combined.length <= TARGET_CHARS) {
      buffer = combined;
      continue;
    }
    if (buffer) {
      chunks.push(mk(buffer));
      buffer = '';
    }
    if (paragraph.length <= TARGET_CHARS) {
      buffer = paragraph;
      continue;
    }
    for (let i = 0; i < paragraph.length; i += TARGET_CHARS) {
      chunks.push(mk(paragraph.slice(i, i + TARGET_CHARS)));
    }
  }
  if (buffer) chunks.push(mk(buffer));
  return chunks;
}
