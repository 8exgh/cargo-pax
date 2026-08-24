import Link from 'next/link';
import { breadcrumbSchema, JsonLd, pageMetadata } from '@/lib/seo';
import { sortedPosts } from '@/lib/blog';

export const metadata = pageMetadata({
  path: '/blog',
  title: 'The CargoPax blog',
  description:
    'Notes from building parcel tracking on top of shipping emails: what carrier pages actually contain, where tracking numbers collide, and what breaks in production.'
});

export default function Blog() {
  const posts = sortedPosts();
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/blog' }
        ])}
      />

      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Blog</h1>
      <p className="mt-4 text-lg text-gray-700 leading-8">
        Notes from running this in production — the specifics of reading carrier pages, and the things that only
        show up once real parcels are moving.
      </p>

      <ul className="mt-10 space-y-8">
        {posts.map(post => (
          <li key={post.slug} className="border-b border-gray-200 pb-8 last:border-0">
            <h2 className="text-xl font-semibold">
              <Link href={`/blog/${post.slug}`} className="text-gray-900 hover:text-blue-700">
                {post.title}
              </Link>
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              <time dateTime={post.published}>
                {new Date(`${post.published}T00:00:00Z`).toLocaleDateString('en-CA', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  timeZone: 'UTC'
                })}
              </time>{' '}
              · {post.readingMinutes} minute read
            </p>
            <p className="mt-3 text-gray-700 leading-7">{post.description}</p>
            <p className="mt-3">
              <Link href={`/blog/${post.slug}`} className="text-blue-700 underline">
                Read {post.title.split(',')[0].toLowerCase()}
              </Link>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
