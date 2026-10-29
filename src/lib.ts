import { getCollection } from 'astro:content';
export const posts = async () =>
  (await getCollection('blog', (p) => !p.data.draft)).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
export const fmt = (d: Date) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
export const tagSlug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-');
