import { sortedPosts } from '@/lib/blog';
import { canonical } from '@/lib/seo';
import { SITE_NAME } from '@/lib/site';

function xml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function GET() {
  const posts = sortedPosts();
  const lastBuildDate = new Date(`${posts[0]?.modified ?? '2026-09-02'}T00:00:00Z`).toUTCString();
  const items = posts
    .map(
      post => `
    <item>
      <title>${xml(post.title)}</title>
      <link>${xml(canonical(`/blog/${post.slug}`))}</link>
      <guid isPermaLink="true">${xml(canonical(`/blog/${post.slug}`))}</guid>
      <description>${xml(post.description)}</description>
      <category>${xml(post.category)}</category>
      <pubDate>${new Date(`${post.published}T00:00:00Z`).toUTCString()}</pubDate>
    </item>`
    )
    .join('');

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(`${SITE_NAME} package tracking guides`)}</title>
    <link>${xml(canonical('/blog'))}</link>
    <description>Practical guides to tracking packages from email and sharing delivery visibility.</description>
    <language>en-ca</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${xml(canonical('/blog/feed.xml'))}" rel="self" type="application/rss+xml" />${items}
  </channel>
</rss>`;

  return new Response(feed, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400'
    }
  });
}
