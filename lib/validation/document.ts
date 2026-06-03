import { z } from 'zod';

export const createDocumentSchema = z.object({
  title: z.string().trim().min(2).max(200),
  content: z.string().trim().min(1).max(50_000),
});

export const searchSchema = z.object({
  query: z.string().trim().min(2).max(500),
});
