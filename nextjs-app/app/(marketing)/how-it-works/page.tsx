import Link from 'next/link';
import { breadcrumbSchema, JsonLd, pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  path: '/how-it-works',
  title: 'How CargoPax works: forward a shipping email, get a tracked parcel',
  description:
    'What happens between forwarding a shipping email to your @cargopax.ca address and seeing the parcel on your dashboard: how links are chosen, how carrier pages are read, and what happens to the email.'
});

export default function HowItWorks() {
  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'How it works', path: '/how-it-works' }
        ])}
      />

      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">How CargoPax works</h1>
      <p className="mt-4 text-lg text-gray-700 leading-8">
        CargoPax turns a shipping email into a tracked parcel. Here is each step, including the parts that are
        easy to get wrong.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">1. Your organization gets a real mailbox</h2>
      <p className="text-gray-700 leading-7">
        When you sign up you choose a name and get <span className="font-mono">yourname@cargopax.ca</span>. It is
        a genuine mailbox, not a webhook: it has a password, IMAP and SMTP, and you can open it in any mail app.
        CargoPax reads it over IMAP looking for anything new.
      </p>
      <p className="text-gray-700 leading-7 mt-3">
        That matters for a practical reason. If forwarding ever stops working, you can log into the mailbox and
        see for yourself whether the mail arrived — instead of asking us whether our webhook fired.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">2. You forward a shipping email</h2>
      <p className="text-gray-700 leading-7">
        Forward the order confirmation from the shop, or the dispatch notice from the carrier. You can also set a
        rule in your mail client so anything from a given sender goes there automatically. Nothing needs to be
        copied out of the email.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">3. Only genuinely trackable links are kept</h2>
      <p className="text-gray-700 leading-7">
        Shipping emails are full of links, and several of them sit on the carrier&rsquo;s own domain without being
        tracking links at all — surveys, delivery-preference pages, campaign redirects. A link is only tracked
        when its host is a carrier <em>and</em> it carries a token in that carrier&rsquo;s own tracking-number
        format.
      </p>
      <p className="text-gray-700 leading-7 mt-3">
        Where formats overlap — twelve digits is both a FedEx number and a Purolator PIN — CargoPax asks you
        rather than guessing.{' '}
        <Link href="/carriers" className="text-blue-700 underline">
          The formats we match, carrier by carrier
        </Link>
        .
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">4. The carrier page gets read</h2>
      <p className="text-gray-700 leading-7">
        Carrier tracking pages render their status after the page loads, so fetching the URL plainly returns
        nothing useful. CargoPax opens each one in a real browser, reduces the rendered page to its text, and
        reads the journey out of it: label created, on the way, out for delivery, delivered, and the estimated
        delivery date.
      </p>
      <p className="text-gray-700 leading-7 mt-3">
        Dates on those pages usually have no year, so today&rsquo;s date goes in with the request and every date
        that comes back is checked as a real calendar date before it is recorded.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">5. You hear about it</h2>
      <p className="text-gray-700 leading-7">
        Each change becomes an email to your organization&rsquo;s contact address, batched per parcel so four
        movements in one day are one message rather than four. If you turn on notifications you also get them on
        your device — including iPhone and iPad, once CargoPax is added to the Home Screen, which is the only way
        Apple delivers web notifications.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">What happens to the email you forwarded</h2>
      <p className="text-gray-700 leading-7">
        It stays in your CargoPax mailbox, and its parsed text is stored with the record of what was found in it,
        so the dashboard can show you which forwarded email produced which parcel. It is never used for anything
        else, and it is not shared.{' '}
        <Link href="/privacy" className="text-blue-700 underline">
          What is stored, in plain terms
        </Link>
        .
      </p>

      <div className="mt-12 border-t border-gray-200 pt-8">
        <p className="text-gray-700">
          Ready to try it on a real parcel?{' '}
          <Link href="/register" className="text-blue-700 underline font-medium">
            Create an account
          </Link>{' '}
          — it takes a name, an email and a password.
        </p>
      </div>
    </article>
  );
}
