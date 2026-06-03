import { createHash, randomBytes } from 'node:crypto';

/** SHA-256 of the raw key. We only ever store the hash. */
export function hashApiKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/** Generate a new widget API key. The raw value is shown once; we persist the hash. */
export function generateApiKey(): { raw: string; hashed: string; prefix: string } {
  const raw = `hd_${randomBytes(24).toString('base64url')}`;
  return { raw, hashed: hashApiKey(raw), prefix: raw.slice(0, 12) };
}
