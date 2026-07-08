import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { site } from '@/data/site';

export async function GET() {
  const posts = await getCollection('blog');
  return rss({
    title: `${site.name} ブログ`,
    description: site.description,
    site: site.url,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.slug}/`
    }))
  });
}
