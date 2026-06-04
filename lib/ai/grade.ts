import { generateText } from './gemini';

const GRADER_MODEL = process.env.GEMINI_GRADER_MODEL ?? 'gemini-2.5-flash-lite';

/**
 * LLM-as-judge faithfulness: 0..1 for how fully `answer` is supported by
 * `context` alone. Shared by the reply agent (self-critique) and the eval harness.
 */
export async function scoreFaithfulness(context: string, answer: string): Promise<number> {
  const system =
    'You are a strict grader. Given CONTEXT and an ANSWER, output JSON {"faithful": n} where ' +
    'n in [0,1] is how fully the ANSWER is supported by the CONTEXT alone. No prose.';
  try {
    const res = await generateText({
      system,
      prompt: `CONTEXT:\n${context}\n\nANSWER:\n${answer}\n\nReturn JSON only.`,
      json: true,
      temperature: 0,
      model: GRADER_MODEL,
    });
    const parsed = JSON.parse(res.text) as { faithful?: unknown };
    const value = Number(parsed.faithful);
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.5;
  } catch {
    return 0.5;
  }
}
