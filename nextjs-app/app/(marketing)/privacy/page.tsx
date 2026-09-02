import Link from 'next/link';
import { breadcrumbSchema, JsonLd, pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  path: '/privacy',
  title: 'CargoPax privacy: what we store and why',
  description:
    'What CargoPax holds when you forward shipping emails, who in your organization can see it, and which service providers process any part of it.'
});

export default function Privacy() {
  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Privacy', path: '/privacy' }
        ])}
      />

      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">What CargoPax stores</h1>
      <p className="mt-4 text-lg text-gray-700 leading-8">
        Written as a description of what the software actually does, because that is more useful than a policy
        that describes an intention.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">What is held</h2>
      <ul className="list-disc list-inside text-gray-700 space-y-2 leading-7">
        <li>
          <strong>Your account</strong> — the email address you sign in with, a hash of your password, your
          organization&rsquo;s name and optional logo, and whether you are an admin.
        </li>
        <li>
          <strong>Emails you forward</strong> — they arrive in your organization&rsquo;s mailbox and stay there.
          Their text is also stored with the record of what was found in them, so the dashboard can show which
          email produced which parcel.
        </li>
        <li>
          <strong>Parcels</strong> — the tracking link, the carrier, the number, the label you give it, and every
          status change read from the carrier.
        </li>
        <li>
          <strong>Your mailbox credentials</strong> — the password for the <span className="font-mono">@cargopax.ca</span>{' '}
          inbox is stored so the software can read the mailbox on your behalf, and it is shown to you in Settings
          so you can use the mailbox yourself.
        </li>
        <li>
          <strong>Notification subscriptions</strong> — if you turn on device notifications, the subscription
          your browser issues.
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">Who can see it</h2>
      <p className="text-gray-700 leading-7">
        Everyone in your organization can see its parcels and the emails forwarded to its address. That is the
        point of a shared address, and worth knowing before you forward something personal to a work
        organization. People added by an admin are read-only unless promoted.
      </p>
      <p className="text-gray-700 leading-7 mt-3">
        Your organization&rsquo;s logo is served only to signed-in members of that organization, not to the public
        web.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">What leaves the system</h2>
      <ul className="list-disc list-inside text-gray-700 space-y-2 leading-7">
        <li>
          <strong>Carrier pages are fetched</strong> from the carrier, using the tracking link. The carrier sees a
          request for that tracking number, as it would if you opened the link yourself.
        </li>
        <li>
          <strong>Page text goes to OpenAI</strong> to read the delivery status out of it, along with the text of
          a forwarded email to name the shipment. That is the text of the carrier page and the email, and nothing
          about your account.
        </li>
        <li>
          <strong>Notification emails</strong> are sent through Gmail&rsquo;s mail servers to your contact address.
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">What is not done</h2>
      <p className="text-gray-700 leading-7">
        CargoPax has no access to your own mailbox: it only ever sees mail you forward to it. There is no
        advertising, no tracking pixels, no analytics scripts on these pages, and your data is not sold or shared
        with anyone beyond the services listed above.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">Removing things</h2>
      <p className="text-gray-700 leading-7">
        Deleting a parcel removes it from your dashboard. To have an organization and everything in it removed,
        reply to any email CargoPax has sent you and ask — a person will do it.
      </p>

      <p className="mt-10 text-sm text-gray-500">
        Last updated 24 August 2026. If this page and the software ever disagree, the software is the bug —{' '}
        <Link href="/about" className="text-blue-700 underline">
          tell us
        </Link>
        .
      </p>
    </article>
  );
}
