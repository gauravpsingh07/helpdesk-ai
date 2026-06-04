// Prompt-injection defense for untrusted text (retrieved chunks, user input).
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+|the\s+)?(previous|above|prior)\s+(instructions|prompts?)/i,
  /disregard\s+(all\s+|the\s+)?(previous|above|prior)/i,
  /you\s+are\s+now\b/i,
  /system\s+prompt/i,
  /reveal\s+(your|the)\s+(system|instructions|prompt)/i,
  /\bpretend\s+to\s+be\b/i,
];

export function detectInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((re) => re.test(text));
}

/**
 * Neutralize injection-style lines in untrusted content so the model treats it
 * as data, not instructions. Returns the cleaned text and whether anything fired.
 */
export function sanitizeForContext(text: string): { text: string; flagged: boolean } {
  let flagged = false;
  const lines = text.split('\n').map((line) => {
    if (INJECTION_PATTERNS.some((re) => re.test(line))) {
      flagged = true;
      return '[removed: possible prompt injection]';
    }
    return line;
  });
  return { text: lines.join('\n'), flagged };
}
