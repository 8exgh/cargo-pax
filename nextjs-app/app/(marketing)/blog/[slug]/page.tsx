import Link from 'next/link';
import { notFound } from 'next/navigation';
import { breadcrumbSchema, canonical, JsonLd, OWNER, pageMetadata } from '@/lib/seo';
import { getPost, posts } from '@/lib/blog';
import { SITE_NAME } from '@/lib/site';

// Every post is known at build time, so each one is a static file rather
// than a render on request.
export function generateStaticParams() {
  return posts.map(post => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) {
    return pageMetadata({ path: '/blog', title: 'Not found', description: 'That post does not exist.' });
  }
  return pageMetadata({
    path: `/blog/${post.slug}`,
    title: post.title,
    description: post.description,
    type: 'article',
    published: post.published,
    modified: post.modified
  });
}

export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) {
    notFound();
  }

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.published,
    dateModified: post.modified,
    author: { '@type': 'Organization', name: OWNER.name, url: OWNER.url },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: canonical('/') },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical(`/blog/${post.slug}`) }
  };

  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      <JsonLd data={articleSchema} />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/blog' },
          { name: post.title, path: `/blog/${post.slug}` }
        ])}
      />

      <nav aria-label="Breadcrumb" className="text-sm text-gray-500">
        <Link href="/blog" className="hover:text-gray-900">
          Blog
        </Link>
      </nav>

      <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">{post.title}</h1>
      <p className="mt-3 text-sm text-gray-500">
        <time dateTime={post.published}>
          {new Date(`${post.published}T00:00:00Z`).toLocaleDateString('en-CA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC'
          })}
        </time>{' '}
        · {post.readingMinutes} minute read · {OWNER.name}
      </p>

      <div className="mt-8 space-y-4">{post.body}</div>

      <div className="mt-12 border-t border-gray-200 pt-8 text-gray-700">
        <p>
          CargoPax does this for you automatically —{' '}
          <Link href="/how-it-works" className="text-blue-700 underline">
            see how it works
          </Link>{' '}
          or{' '}
          <Link href="/register" className="text-blue-700 underline">
            create an account
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
