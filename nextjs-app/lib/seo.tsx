import type { Metadata } from 'next';
import { getSiteUrl, SITE_NAME } from '@/lib/site';

/* Metadata helpers for the public pages.

   The parts that actually matter to a search engine: one canonical URL per
   page (the app answers on two hostnames, and without this they would look
   like duplicate sites), a distinct title and description per page, and
   structured data that describes what is genuinely on the page. */

export const OWNER = {
  name: '8Examples',
  url: 'https://8examples.com',
  person: 'Sean Bennett'
};

export function canonical(path: string): string {
  return `${getSiteUrl()}${path === '/' ? '' : path}`;
}

export function pageMetadata(options: {
  path: string;
  title: string;
  description: string;
  type?: 'website' | 'article';
  published?: string;
  modified?: string;
}): Metadata {
  const url = canonical(options.path);
  return {
    title: options.title,
    description: options.description,
    alternates: { canonical: url },
    openGraph: {
      title: options.title,
      description: options.description,
      url,
      siteName: SITE_NAME,
      type: options.type ?? 'website',
      ...(options.published ? { publishedTime: options.published, modifiedTime: options.modified } : {})
    },
    twitter: { card: 'summary', title: options.title, description: options.description }
  };
}

/* JSON-LD, rendered as a plain script tag. Every claim in here is also
   visible on the page - structured data that describes things a reader
   cannot see is exactly what Google's spam policies single out. */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: canonical('/'),
    logo: canonical('/icon-512.png'),
    parentOrganization: { '@type': 'Organization', name: OWNER.name, url: OWNER.url }
  };
}

export function webSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: canonical('/'),
    publisher: { '@type': 'Organization', name: OWNER.name, url: OWNER.url }
  };
}

export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: canonical(crumb.path)
    }))
  };
}
