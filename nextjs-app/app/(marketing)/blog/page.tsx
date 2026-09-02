import Link from 'next/link';
import { breadcrumbSchema, canonical, JsonLd, pageMetadata } from '@/lib/seo';
import { sortedPosts } from '@/lib/blog';

export const metadata = pageMetadata({
  path: '/blog',
  title: 'Package tracking guides for people and small teams',
  description:
    'Practical guides to tracking multiple packages, sharing delivery visibility with a team, using shipping emails safely, and understanding carrier updates.',
  keywords: ['package tracking guides', 'track multiple packages', 'shared package tracking']
});

export default function Blog() {
  const posts = sortedPosts();
  const blogSchema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'CargoPax package tracking guides',
    description:
      'Practical guides for organizing incoming deliveries, tracking packages from email and understanding carrier status pages.',
    url: canonical('/blog'),
    blogPost: posts.map(post => ({
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      datePublished: post.published,
      dateModified: post.modified,
      url: canonical(`/blog/${post.slug}`)
    }))
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <JsonLd data={blogSchema} />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/blog' }
        ])}
      />

      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Blog</h1>
      <p className="mt-4 max-w-3xl text-lg text-gray-700 leading-8">
        Useful ways to keep deliveries visible without turning parcel tracking into another operations project.
        These guides cover multi-carrier tracking, small-team workflows, email privacy and what carrier pages
        really report.
      </p>
      <div className="mt-6 flex flex-wrap gap-2 text-sm" aria-label="Topics covered">
        {['Multiple packages', 'Small teams', 'Email privacy', 'Carrier accuracy'].map(topic => (
          <span key={topic} className="rounded-full bg-blue-50 px-3 py-1 text-blue-800">
            {topic}
          </span>
        ))}
      </div>

      <ul className="mt-10 grid gap-6 sm:grid-cols-2">
        {posts.map(post => (
          <li key={post.slug} className="flex flex-col rounded-xl border border-gray-200 bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{post.category}</p>
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
            <p className="mt-3 text-sm text-gray-500">For {post.audience.toLowerCase()}</p>
            <p className="mt-auto pt-5">
              <Link href={`/blog/${post.slug}`} className="text-blue-700 underline">
                Read the guide
              </Link>
            </p>
          </li>
        ))}
      </ul>

      <aside className="mt-12 rounded-xl bg-gray-900 px-6 py-8 text-white sm:px-8">
        <h2 className="text-2xl font-semibold">Put the workflow to work</h2>
        <p className="mt-3 max-w-2xl leading-7 text-gray-200">
          CargoPax turns the shipping messages you choose to forward into one shared view of what is moving and
          what is arriving next.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/register" className="rounded-md bg-white px-4 py-2 font-medium text-gray-900 hover:bg-gray-100">
            Create an account
          </Link>
          <Link href="/shared-package-tracking" className="rounded-md border border-gray-600 px-4 py-2 font-medium hover:bg-gray-800">
            See the team workflow
          </Link>
        </div>
      </aside>
    </div>
  );
}
