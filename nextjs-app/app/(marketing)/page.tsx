import Link from 'next/link';
import { JsonLd, organizationSchema, pageMetadata, webSiteSchema } from '@/lib/seo';

export const metadata = pageMetadata({
  path: '/',
  title: 'CargoPax: parcel tracking from your shipping emails',
  description:
    'Forward a shipping email to your own @cargopax.ca address. Track UPS, FedEx, USPS, DHL, Canada Post and Purolator parcels in one shared view.',
  keywords: ['email package tracking', 'shared package tracking', 'multi-carrier parcel tracker']
});

const STEPS = [
  {
    title: 'You get your own address',
    body: 'Signing up gives your organization a real mailbox, yours@cargopax.ca. It is an actual inbox with IMAP and SMTP, not a webhook.'
  },
  {
    title: 'You forward the shipping email',
    body: 'The order confirmation from the shop, or the notice from the carrier. Nothing to copy out of it, and no browser extension.'
  },
  {
    title: 'CargoPax finds what is trackable',
    body: 'It reads the email, keeps the links that carry a real tracking number in that carrier’s format, and ignores the marketing links sitting next to them.'
  },
  {
    title: 'It follows the parcel and tells you',
    body: 'Label created, on the way, out for delivery, delivered — by email, and as a notification on your phone if you want one.'
  }
];

export default function Home() {
  return (
    <>
      <JsonLd data={organizationSchema()} />
      <JsonLd data={webSiteSchema()} />

      <section className="max-w-4xl mx-auto px-4 pt-16 pb-12">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight">
          Your parcels, tracked from the emails you already get
        </h1>
        <p className="mt-5 text-lg text-gray-700 max-w-2xl leading-8">
          Forward a shipping email to your own <span className="font-mono">@cargopax.ca</span> address. CargoPax
          picks out the tracking links, follows each parcel to the door, and tells you when something changes.
          No copying tracking numbers, no browser extension, no app to install.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/register"
            className="bg-blue-600 text-white px-5 py-3 rounded-md hover:bg-blue-700 font-medium"
          >
            Create an account
          </Link>
          <Link
            href="/how-it-works"
            className="px-5 py-3 rounded-md border border-gray-300 text-gray-800 hover:bg-gray-50 font-medium"
          >
            See how it works
          </Link>
        </div>
        <p className="mt-4 text-sm text-gray-500">
          Works with UPS, FedEx, USPS, DHL, Canada Post and Purolator.{' '}
          <Link href="/carriers" className="text-blue-700 hover:underline">
            What we read from each carrier
          </Link>
          .
        </p>
      </section>

      <section className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-semibold text-gray-900">How it works</h2>
          <ol className="mt-6 grid gap-6 sm:grid-cols-2">
            {STEPS.map((step, index) => (
              <li key={step.title} className="bg-white rounded-lg border border-gray-200 p-5">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-semibold">
                  {index + 1}
                </span>
                <h3 className="mt-3 font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-1 text-gray-700 leading-7">{step.body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-gray-700">
            <Link href="/how-it-works" className="text-blue-700 underline">
              The longer version, including what happens to the email itself
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-semibold text-gray-900">Built for a team, not just a person</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <div>
            <h3 className="font-semibold text-gray-900">One shared view</h3>
            <p className="mt-1 text-gray-700 leading-7">
              Everyone in your organization sees the same parcels. Whoever ordered it, whoever is waiting for it.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Read-only by default</h3>
            <p className="mt-1 text-gray-700 leading-7">
              People you add can see every shipment and ask for a fresh check, without being able to change what
              is tracked.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Notifications that arrive</h3>
            <p className="mt-1 text-gray-700 leading-7">
              Email, plus notifications on the web and on iPhone and iPad once you add CargoPax to the Home
              Screen.
            </p>
          </div>
        </div>
        <p className="mt-7">
          <Link href="/shared-package-tracking" className="text-blue-700 underline">
            See how shared package tracking works for small teams
          </Link>
          .
        </p>
      </section>

      <section className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-semibold text-gray-900">Why forwarding, instead of connecting an account</h2>
          <p className="mt-4 text-gray-700 leading-7 max-w-3xl">
            Carrier APIs need an account with each carrier, and most of them expect a business relationship
            before they will tell you where your own parcel is. Shipping emails need none of that: the shop
            already sent you one, and it already contains the tracking link. Forwarding turns a thing you were
            going to delete into the thing that does the work.
          </p>
          <p className="mt-4 text-gray-700 leading-7 max-w-3xl">
            It also means CargoPax never needs your mailbox password or read access to your inbox. You send it
            one email at a time, and it only ever sees what you forward.
          </p>
          <p className="mt-6 text-gray-700">
            Read:{' '}
            <Link href="/blog/track-packages-from-email-without-inbox-access" className="text-blue-700 underline">
              how email tracking works without giving an app your inbox
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-semibold text-gray-900">Practical package tracking guides</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <article className="rounded-lg border border-gray-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Guide</p>
            <h3 className="mt-2 font-semibold text-gray-900">
              <Link href="/blog/track-multiple-packages-in-one-place" className="hover:text-blue-700">
                Track multiple packages in one place
              </Link>
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">Compare carrier tabs, inbox features, universal apps and forwarding.</p>
          </article>
          <article className="rounded-lg border border-gray-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Teams</p>
            <h3 className="mt-2 font-semibold text-gray-900">
              <Link href="/blog/shared-package-tracking-workflow-for-small-teams" className="hover:text-blue-700">
                A small-team receiving workflow
              </Link>
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">Make ordering, arrival updates and handoffs visible to the same people.</p>
          </article>
          <article className="rounded-lg border border-gray-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Behind the tracking</p>
            <h3 className="mt-2 font-semibold text-gray-900">
              <Link href="/blog/what-carrier-tracking-pages-actually-say" className="hover:text-blue-700">
                What carrier pages actually say
              </Link>
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">Why overlapping numbers, missing years and rendered pages cause wrong answers.</p>
          </article>
        </div>
        <p className="mt-6">
          <Link href="/blog" className="text-blue-700 underline">Browse all package tracking guides</Link>.
        </p>
      </section>

      <section className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-14">
          <h2 className="text-2xl font-semibold text-gray-900">Start with one parcel</h2>
          <p className="mt-3 text-gray-700 leading-7 max-w-2xl">
            Create an account, forward the next shipping email you get, and see whether the dates it shows you
            match the ones the carrier eventually delivers on.
          </p>
          <Link
            href="/register"
            className="mt-6 inline-block bg-blue-600 text-white px-5 py-3 rounded-md hover:bg-blue-700 font-medium"
          >
            Create an account
          </Link>
        </div>
      </section>
    </>
  );
}
