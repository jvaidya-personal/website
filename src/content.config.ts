import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const ingredient = z.object({
  amount: z.string().nullable().optional(),
  measure: z.string().nullable().optional(),
  ingredient: z.string().nullable().optional(),
  comment: z.string().nullable().optional(),
});

const recipes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/recipes' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    id: z.number().optional(),
    categories: z.array(z.string()).default(['Other']),
    comingSoon: z.boolean().default(false),
    ingredients: z.array(z.object({ title: z.string().nullable().optional(), items: z.array(ingredient) })).default([]),
    steps: z.array(z.string()).default([]),
    notes: z.array(z.string()).optional(),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    // Reposted Facebook posts: source: facebook + the original post date (and optional link)
    source: z.enum(['facebook']).optional(),
    originalDate: z.coerce.date().optional(),
    originalUrl: z.string().url().optional(),
  }),
});

export const collections = { recipes, blog };
