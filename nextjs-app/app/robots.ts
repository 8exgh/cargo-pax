import type { MetadataRoute } from 'next';
import { canonical } from '@/lib/seo';

/* Crawlers get the public pages and nothing else. The signed-in app is
   behind a token, so it would only ever yield a login screen - keeping it
   out of the index keeps the crawl budget on pages that say something. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/dashboard', '/settings', '/verify', '/change-password', '/reset-password', '/feedback']
      }
    ],
    sitemap: canonical('/sitemap.xml'),
    host: canonical('/')
  };
}
