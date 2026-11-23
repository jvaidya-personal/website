import { getCollection, type CollectionEntry } from 'astro:content';

export type MarathiPost = CollectionEntry<'marathi'>;

/** All Marathi posts, newest first. */
export const marathiPosts = async () =>
  (await getCollection('marathi')).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

/** Date in Marathi, in IST (the posts were written in India time). */
export const mrDate = (d: Date) =>
  d.toLocaleDateString('mr-IN', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' });
export const isoDate = (d: Date) => d.toISOString();

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

/** First non-empty line, trimmed to `max` characters. */
export const firstLine = (text: string, max = 90) => {
  const line = clean((text || '').split('\n').find((l) => l.trim()) || '');
  return line.length > max ? line.slice(0, max).replace(/\s+\S*$/, '') + '…' : line;
};

/** Short excerpt after the first line, for the listing. */
export const excerpt = (text: string, max = 170) => {
  const lines = (text || '').split('\n').filter((l) => l.trim());
  const first = clean(lines[0] || '');
  if (first.length > 90) return '';
  const rest = clean(lines.slice(1).join(' '));
  return rest.length > max ? rest.slice(0, max).replace(/\s+\S*$/, '') + '…' : rest;
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const linkify = (s: string) =>
  esc(s).replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)\]"'।]/g, (u) => `<a href="${u}" rel="noopener">${u}</a>`);

/** Original text, verbatim: blank lines -> paragraphs, single newlines -> <br>, URLs linked. */
export const textToHtml = (text: string) =>
  (text || '')
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .filter((p) => p.trim())
    .map((p) => `<p>${p.replace(/^\n+|\n+$/g, '').split('\n').map(linkify).join('<br>')}</p>`)
    .join('\n');
