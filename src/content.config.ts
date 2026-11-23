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

// मराठी लिखाण: Marathi Facebook posts, one file per post (src/content/marathi/<date>-<time>.md).
// The body is the original post text, shown verbatim (not parsed as Markdown).
const marathi = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/marathi' }),
  schema: z.object({
    fbId: z.string(),
    date: z.coerce.date(),
    link: z.string().url().optional(),
    images: z.array(z.object({ src: z.string(), thumb: z.string(), width: z.number(), height: z.number() })).default([]),
    videos: z.array(z.object({ src: z.string(), poster: z.string().optional(), thumb: z.string().optional() })).default([]),
    // Links from Jiten's own comment(s) on the post ("लिंक कमेंटमध्ये"), shown below the text
    // url: absolute, mailto:, or a site path like /marathi/...; text: optional link text (defaults to the url)
    commentLinks: z.array(z.object({ url: z.string().regex(/^(https?:\/\/|mailto:|\/)/), label: z.string().optional(), text: z.string().optional() })).default([]),
    // Substantive text from his own comment (e.g. the original poem he translated), shown verbatim below the post
    originalPoem: z.object({ heading: z.string(), attribution: z.string().optional(), text: z.string() }).optional(),
  }),
});

// On Writers: Jiten's English essays on the writers he loves (one .md per essay, text as written).
const essays = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/essays' }),
  schema: z.object({
    title: z.string(),
    order: z.number(),
    source: z.string().url().optional(),
  }),
});

export const collections = { recipes, blog, marathi, essays };
