// Heuristic PII redaction. Applied to ingested content (before it is chunked,
// embedded, and later surfaced to the model) and usable on logs. Order matters:
// more specific patterns run before broader ones.
const PATTERNS: { name: string; re: RegExp; mask: string }[] = [
  {
    name: 'email',
    re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    mask: '[redacted-email]',
  },
  { name: 'ssn', re: /\b\d{3}-\d{2}-\d{4}\b/g, mask: '[redacted-ssn]' },
  { name: 'card', re: /\b(?:\d[ -]?){13,16}\b/g, mask: '[redacted-card]' },
  {
    name: 'phone',
    re: /(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
    mask: '[redacted-phone]',
  },
];

export type RedactionResult = { text: string; redactions: Record<string, number> };

export function redactPii(input: string): RedactionResult {
  let text = input;
  const redactions: Record<string, number> = {};
  for (const pattern of PATTERNS) {
    let count = 0;
    text = text.replace(pattern.re, () => {
      count += 1;
      return pattern.mask;
    });
    if (count > 0) redactions[pattern.name] = count;
  }
  return { text, redactions };
}
