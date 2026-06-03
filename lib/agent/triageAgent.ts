import { generateText } from '@/lib/ai/gemini';

const TRIAGE_MODEL = process.env.GEMINI_TRIAGE_MODEL ?? 'gemini-2.5-flash-lite';

export type Triage = { tags: string[]; priority: number };

/** Classify a ticket into 1-3 tags and a 1-5 priority. Falls back safely on error. */
export async function runTriageAgent(subject: string, body: string): Promise<Triage> {
  const system =
    'You triage support tickets. Output JSON {"tags": string[], "priority": number} only. ' +
    'tags: 1-3 short lowercase keywords. priority: integer 1-5 where 1 is most urgent.';
  try {
    const res = await generateText({
      system,
      prompt: `Subject: ${subject}\n\nMessage: ${body}\n\nReturn JSON.`,
      json: true,
      temperature: 0,
      model: TRIAGE_MODEL,
    });
    const parsed = JSON.parse(res.text) as { tags?: unknown; priority?: unknown };
    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.filter((t): t is string => typeof t === 'string').slice(0, 3)
      : [];
    const p = Number(parsed.priority);
    const priority = Number.isInteger(p) && p >= 1 && p <= 5 ? p : 3;
    return { tags, priority };
  } catch {
    return { tags: [], priority: 3 };
  }
}
