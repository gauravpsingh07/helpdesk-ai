// Thin, provider-agnostic-ish wrapper over Google's Gemini REST API.
// No SDK dependency: timeout + retry/backoff are handled explicitly so the AI
// behaves like any other predictable system dependency. Swap this file to back
// the same `embedTexts` / `generateText` surface with Ollama, OpenAI, etc.

const BASE = 'https://generativelanguage.googleapis.com/v1beta';
const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL ?? 'gemini-embedding-001';
const GEN_MODEL = process.env.GEMINI_GEN_MODEL ?? 'gemini-2.5-flash';
const EMBED_DIM = Number(process.env.GEMINI_EMBED_DIM ?? '768');

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');
  return key;
}

type EmbedResponse = { embedding?: { values: number[] } };
type GenResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
};

async function postJson<T>(
  url: string,
  body: unknown,
  timeoutMs = 30_000,
  retries = 2,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (res.ok) return (await res.json()) as T;
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        await sleep(400 * 2 ** attempt);
        continue;
      }
      const errText = await res.text().catch(() => '');
      throw new Error(`Gemini API ${res.status}: ${errText.slice(0, 200)}`);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('Gemini API')) throw err;
      if (attempt >= retries) throw err;
      await sleep(400 * 2 ** attempt);
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Embed a batch of texts into `EMBED_DIM`-dimensional vectors. */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const vectors: number[][] = [];
  for (const text of texts) {
    const json = await postJson<EmbedResponse>(
      `${BASE}/models/${EMBED_MODEL}:embedContent?key=${apiKey()}`,
      { content: { parts: [{ text }] }, outputDimensionality: EMBED_DIM },
    );
    const values = json.embedding?.values;
    if (!values) throw new Error('Gemini returned no embedding');
    vectors.push(values);
  }
  return vectors;
}

export async function embedOne(text: string): Promise<number[]> {
  const [vector] = await embedTexts([text]);
  return vector ?? [];
}

export type GenerateResult = {
  text: string;
  promptTokens: number;
  completionTokens: number;
  model: string;
};

export type GenerateOptions = {
  prompt: string;
  system?: string;
  temperature?: number;
  json?: boolean;
  model?: string;
};

/** Generate text with Gemini, returning the output plus token usage. */
export async function generateText(opts: GenerateOptions): Promise<GenerateResult> {
  const model = opts.model ?? GEN_MODEL;
  const body: Record<string, unknown> = {
    contents: [{ role: 'user', parts: [{ text: opts.prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.2,
      ...(opts.json ? { responseMimeType: 'application/json' } : {}),
    },
  };
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };

  const json = await postJson<GenResponse>(
    `${BASE}/models/${model}:generateContent?key=${apiKey()}`,
    body,
  );
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  return {
    text,
    promptTokens: json.usageMetadata?.promptTokenCount ?? 0,
    completionTokens: json.usageMetadata?.candidatesTokenCount ?? 0,
    model,
  };
}
