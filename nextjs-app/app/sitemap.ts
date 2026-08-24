import type { MetadataRoute } from 'next';
import { canonical } from '@/lib/seo';
import { sortedPosts } from '@/lib/blog';

/* Only pages worth indexing: the public ones. Signed-in pages are excluded
   here and in robots.ts - listing a login wall wastes a crawl and gives a
   search engine nothing to rank. */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] = [
    { path: '/', changeFrequency: 'monthly', priority: 1 },
    { path: '/how-it-works', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/carriers', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/blog', changeFrequency: 'weekly', priority: 0.6 },
    { path: '/about', changeFrequency: 'yearly', priority: 0.4 },
    { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
    { path: '/register', changeFrequency: 'yearly', priority: 0.5 }
  ];

  const lastModified = new Date('2026-08-24');

  return [
    ...pages.map(page => ({
      url: canonical(page.path),
      lastModified,
      changeFrequency: page.changeFrequency,
      priority: page.priority
    })),
    ...sortedPosts().map(post => ({
      url: canonical(`/blog/${post.slug}`),
      lastModified: new Date(`${post.modified}T00:00:00Z`),
      changeFrequency: 'yearly' as const,
      priority: 0.7
    }))
  ];
}
