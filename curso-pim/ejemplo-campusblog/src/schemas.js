import { z } from 'zod';

export const registerSchema = z.object({
    email: z.string().email('Email no válido'),
    name: z.string().trim().min(2, 'Mínimo 2 caracteres').max(80),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
});

export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

export const postSchema = z.object({
    title: z.string().trim().min(3, 'Mínimo 3 caracteres').max(120),
    body: z.string().trim().min(10, 'Escribe al menos 10 caracteres'),
    categoryId: z.number().int().positive().nullable().optional(),
});

export const listQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    q: z.string().trim().max(100).optional(),
});
