import Link from 'next/link';
import { breadcrumbSchema, JsonLd, OWNER, pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  path: '/about',
  title: 'About CargoPax and 8Examples',
  description:
    'CargoPax is built and run by 8Examples in Calgary, Alberta. What it is, who maintains it, and how to reach a human about it.'
});

export default function About() {
  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'About', path: '/about' }
        ])}
      />

      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">About CargoPax</h1>

      <p className="mt-4 text-lg text-gray-700 leading-8">
        CargoPax follows parcels using the shipping emails you already receive. It is built and run by{' '}
        <a href={OWNER.url} className="text-blue-700 underline">
          8Examples
        </a>
        , a small software company in Calgary, Alberta, and maintained by {OWNER.person}.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">Why it exists</h2>
      <p className="text-gray-700 leading-7">
        Parcel tracking is a solved problem for one parcel and an annoying one for six. The tracking links are
        scattered across order confirmations from different shops, each carrier has its own page, and none of
        them tell you anything unless you go and look. The information was already in your inbox; it just was
        not in one place.
      </p>
      <p className="text-gray-700 leading-7 mt-3">
        Forwarding was the approach that needed nothing from anybody else. No carrier accounts, no API
        agreements, no access to your mailbox — you send one email, and that is the whole integration.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">How it is built</h2>
      <p className="text-gray-700 leading-7">
        The mailboxes are real hosted email. Carrier pages are read in a headless browser, because their status
        only appears after the page runs. Every state change — a parcel starting to move, a delivery date
        appearing, a page failing to load — is stored as an event, which is why the dashboard can show you the
        whole journey rather than only the latest guess.
      </p>
      <p className="text-gray-700 leading-7 mt-3">
        We write about the parts that turned out to be harder than expected on{' '}
        <Link href="/blog" className="text-blue-700 underline">
          the blog
        </Link>
        .
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">Getting in touch</h2>
      <p className="text-gray-700 leading-7">
        Every email CargoPax sends comes from a monitored address, so replying to a shipment notification reaches
        a person. There is also a feedback box on every page inside the app.
      </p>

      <div className="mt-12 border-t border-gray-200 pt-8 text-gray-700">
        <p>
          <Link href="/how-it-works" className="text-blue-700 underline">
            How it works
          </Link>{' '}
          ·{' '}
          <Link href="/privacy" className="text-blue-700 underline">
            What we store
          </Link>
        </p>
      </div>
    </article>
  );
}
