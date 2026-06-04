// Out-of-scope / unsafe requests the agent must refuse + escalate. Deliberately
// narrow so it never trips legitimate support questions (e.g. "reset my password").
const RESTRICTED: RegExp[] = [
  /ignore\s+(your|the)\s+(instructions|rules|policy)/i,
  /reveal\s+.*(api\s*key|secret|system\s+prompt|password\s+hash)/i,
  /\b(sql\s+injection|exploit\s+the|hack\s+the)\b/i,
];

export function isRestricted(question: string): boolean {
  return RESTRICTED.some((re) => re.test(question));
}
