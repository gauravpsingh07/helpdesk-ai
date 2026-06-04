'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/session';
import { getTenantDb } from '@/lib/db/tenant';
import { audit } from '@/lib/audit';
import { enqueue } from '@/lib/jobs/queue';
import { retrieve, type RetrievedChunk } from '@/lib/rag/retrieve';
import { createDocumentSchema, searchSchema } from '@/lib/validation/document';

export async function createDocumentAction(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const actor = await requireRole(['ADMIN', 'AGENT']);
  const parsed = createDocumentSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
  });
  if (!parsed.success) return 'A title (2+ chars) and some content are required.';

  const db = getTenantDb(actor.tenantId);
  const doc = await db.document.create({
    data: { tenantId: actor.tenantId, title: parsed.data.title, status: 'PENDING' },
  });
  await audit({
    tenantId: actor.tenantId,
    actorId: actor.userId,
    action: 'document.create',
    target: doc.id,
  });

  // Index asynchronously: the document shows PENDING until the worker finishes.
  await enqueue('document.ingest', {
    tenantId: actor.tenantId,
    documentId: doc.id,
    content: parsed.data.content,
  });

  revalidatePath('/knowledge');
  return undefined;
}

export async function deleteDocumentAction(formData: FormData): Promise<void> {
  const actor = await requireRole(['ADMIN', 'AGENT']);
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const db = getTenantDb(actor.tenantId);
  await db.document.deleteMany({ where: { id } }); // chunks cascade
  await audit({
    tenantId: actor.tenantId,
    actorId: actor.userId,
    action: 'document.delete',
    target: id,
  });
  revalidatePath('/knowledge');
}

export type SearchState = { query: string; results: RetrievedChunk[]; error?: string } | undefined;

export async function searchKnowledgeAction(
  _prev: SearchState,
  formData: FormData,
): Promise<SearchState> {
  const actor = await requireRole(['ADMIN', 'AGENT']);
  const parsed = searchSchema.safeParse({ query: formData.get('query') });
  if (!parsed.success) return { query: '', results: [], error: 'Enter at least 2 characters.' };

  const results = await retrieve(actor.tenantId, parsed.data.query, 5);
  return { query: parsed.data.query, results };
}
