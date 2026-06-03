import { describe, expect, it } from 'vitest';
import { chunkText } from '@/lib/rag/chunk';

describe('chunkText', () => {
  it('returns nothing for blank input', () => {
    expect(chunkText('   \n\n  ')).toEqual([]);
  });

  it('keeps short text as a single chunk', () => {
    const chunks = chunkText('Hello world.\n\nA second paragraph.');
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.content).toContain('Hello world.');
  });

  it('splits long content into multiple bounded chunks', () => {
    const paragraph = 'lorem ipsum '.repeat(120); // ~1440 chars
    const text = Array.from({ length: 5 }, () => paragraph).join('\n\n');
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.content.length <= 1600)).toBe(true);
  });
});
