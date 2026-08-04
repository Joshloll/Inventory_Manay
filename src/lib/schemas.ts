import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Enter your email or username'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const passwordChangeSchema = z.object({
  password: z.string().min(10, 'Use at least 10 characters'),
});

export const itemSchema = z.object({
  name: z.string().min(2),
  sku: z.string().min(2),
  category: z.string().min(2),
  unitPrice: z.coerce.number().positive(),
  quantity: z.coerce.number().int().min(0),
  reorderThreshold: z.coerce.number().int().min(0),
  supplierNotes: z.string().optional().default(''),
  imageUrl: z.string().url().optional().or(z.literal('')).default(''),
});

export const sellSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
});

export const restockSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
  notes: z.string().optional().default(''),
});

export const accountSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(['ADMIN', 'SELLER']),
  password: z.string().min(10),
});

export const accountActionSchema = z.object({
  profileId: z.string().uuid(),
  action: z.enum(['deactivate', 'delete']),
});

export const reportRangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  format: z.enum(['csv', 'xlsx']).default('csv'),
});
