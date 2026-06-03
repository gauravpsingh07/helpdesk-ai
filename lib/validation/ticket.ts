import { z } from 'zod';

export const createTicketSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  body: z.string().trim().min(1).max(5000),
  priority: z.coerce.number().int().min(1).max(5).default(3),
  tags: z.array(z.string()).default([]),
});

export const postMessageSchema = z.object({
  body: z.string().trim().min(1).max(5000),
});

export const ticketStatusSchema = z.enum(['OPEN', 'PENDING', 'RESOLVED']);

export const widgetMessageSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  body: z.string().trim().min(1).max(5000),
  email: z.string().trim().min(1).max(200).optional(),
});
