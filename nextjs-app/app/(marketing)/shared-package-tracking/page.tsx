import Link from 'next/link';
import { breadcrumbSchema, canonical, JsonLd, pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  path: '/shared-package-tracking',
  title: 'Shared package tracking for small teams',
  description:
    'Give your office or operations team one view of incoming UPS, FedEx, USPS, DHL, Canada Post and Purolator deliveries—starting with a forwarded email.',
  keywords: ['shared package tracking', 'team package tracker', 'business package tracking', 'incoming delivery tracker']
});

const FITS = [
  {
    title: 'Offices and studios',
    body: 'The buyer, the person at the door and the person waiting for the item are rarely the same person.'
  },
  {
    title: 'Field and project teams',
    body: 'Parts, equipment and samples need a recognizable project label, not a tracking number buried in chat.'
  },
  {
    title: 'Clinics and nonprofits',
    body: 'Several people order supplies, while one shared view shows what is moving and what should arrive next.'
  }
];

const FEATURES = [
  ['One intake address', 'Everyone forwards shipping notices to the same organization mailbox.'],
  ['One shared dashboard', 'Members see the same active shipments, journey dates and source messages.'],
  ['Safe day-to-day access', 'Read-only members can view shipments and request a fresh check without changing the list.'],
  ['Human labels and groups', 'Admins can rename a parcel for the project, person or site and organize related deliveries.'],
  ['Useful notifications', 'Email and optional device notifications report meaningful status changes.'],
  ['Six major carriers', 'UPS, FedEx, USPS, DHL, Canada Post and Purolator appear in one consistent view.']
];

export default function SharedPackageTracking() {
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'CargoPax shared package tracking',
    serviceType: 'Shared incoming package tracking',
    provider: { '@type': 'Organization', name: 'CargoPax', url: canonical('/') },
    description:
      'A shared parcel dashboard for small teams, populated by forwarding shipping emails to an organization mailbox.',
    url: canonical('/shared-package-tracking')
  };

  return (
    <>
      <JsonLd data={serviceSchema} />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Shared package tracking', path: '/shared-package-tracking' }
        ])}
      />

      <section className="bg-gray-950 text-white">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:py-20">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-300">For small teams</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            One shared view of every package your team is waiting for
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-200">
            Forward shipping emails into one team parcel list. CargoPax follows each supported carrier, keeps the
            delivery journey visible and tells you when the status changes.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="rounded-md bg-blue-500 px-5 py-3 font-medium text-white hover:bg-blue-400">
              Start a shared tracker
            </Link>
            <Link href="/how-it-works" className="rounded-md border border-gray-600 px-5 py-3 font-medium hover:bg-gray-900">
              See how forwarding works
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-400">No connection to anyone&rsquo;s personal or work inbox.</p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14">
        <h2 className="text-2xl font-semibold text-gray-900">Built for the gap between ordering and receiving</h2>
        <p className="mt-4 max-w-3xl text-gray-700 leading-7">
          Carrier pages answer &ldquo;where is this tracking number?&rdquo; A team has a different question:
          &ldquo;what are we waiting for?&rdquo; CargoPax collects incoming deliveries before they reach the door, while
          keeping the original source message and a clear shipment history together.
        </p>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {FITS.map(item => (
            <div key={item.title} className="rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="font-semibold text-gray-900">{item.title}</h3>
              <p className="mt-2 text-gray-700 leading-7">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 py-14">
          <h2 className="text-2xl font-semibold text-gray-900">A three-step delivery workflow</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-3">
            <li>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">1</span>
              <h3 className="mt-3 font-semibold text-gray-900">Forward the shipping notice</h3>
              <p className="mt-2 text-gray-700 leading-7">
                Every organization gets its own <span className="font-mono text-sm">@cargopax.ca</span> address.
                Buyers send the relevant message there instead of copying a number into another system.
              </p>
            </li>
            <li>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">2</span>
              <h3 className="mt-3 font-semibold text-gray-900">CargoPax follows the parcel</h3>
              <p className="mt-2 text-gray-700 leading-7">
                The tracking link becomes a shipment. CargoPax checks the carrier for label created, in transit,
                out for delivery, estimated date and delivered milestones.
              </p>
            </li>
            <li>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">3</span>
              <h3 className="mt-3 font-semibold text-gray-900">The team sees the same answer</h3>
              <p className="mt-2 text-gray-700 leading-7">
                Members can check the shared dashboard and request a refresh. Admins label, group and clean up
                shipments and manage who belongs to the organization.
              </p>
            </li>
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">The useful parts of a team tracker</h2>
            <p className="mt-4 text-gray-700 leading-7">
              CargoPax is intentionally smaller than a shipping platform. It does not buy labels, manage orders or
              ask suppliers to integrate. It starts with the email your team already receives.
            </p>
          </div>
          <dl className="grid gap-5 sm:grid-cols-2">
            {FEATURES.map(([term, detail]) => (
              <div key={term} className="border-l-2 border-blue-500 pl-4">
                <dt className="font-semibold text-gray-900">{term}</dt>
                <dd className="mt-1 text-gray-700 leading-7">{detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-y border-gray-200 bg-blue-50">
        <div className="mx-auto max-w-4xl px-4 py-12">
          <h2 className="text-2xl font-semibold text-gray-900">Know where this tool stops</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="font-semibold text-green-800">A good fit when…</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700 leading-7">
                <li>several people order things for one organization;</li>
                <li>you need incoming visibility across common US and Canadian carriers;</li>
                <li>the source of truth is currently email, chat or browser tabs;</li>
                <li>you want members to see updates without managing the tracker.</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-amber-800">Use something else when…</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700 leading-7">
                <li>you ship customer orders and need branded post-purchase tracking;</li>
                <li>you need thousands of international and regional carriers;</li>
                <li>you need label scanning, signatures or lockers after delivery;</li>
                <li>you need purchasing, inventory or warehouse management.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14">
        <h2 className="text-2xl font-semibold text-gray-900">Start with the next delivery</h2>
        <p className="mt-3 max-w-2xl text-gray-700 leading-7">
          Create the organization, add the people who need visibility, and forward one live shipping message. The
          smallest useful test is whether everyone can answer &ldquo;what is arriving next?&rdquo; without asking the
          buyer.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Link href="/register" className="rounded-md bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700">
            Create an account
          </Link>
          <Link href="/blog/shared-package-tracking-workflow-for-small-teams" className="self-center text-blue-700 underline">
            Read the small-team workflow
          </Link>
        </div>
      </section>
    </>
  );
}
