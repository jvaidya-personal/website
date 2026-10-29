import rss from '@astrojs/rss';
import { posts } from '../lib';
export async function GET(context) {
  const items = await posts();
  return rss({
    title: 'Jiten Vaidya — Blog',
    description: 'Writing by Jiten Vaidya',
    site: context.site,
    items: items.map((p) => ({
      title: p.data.title,
      pubDate: p.data.originalDate ?? p.data.date,
      description: p.data.description,
      categories: p.data.tags,
      link: `/blog/${p.id}/`,
    })),
  });
}
