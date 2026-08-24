import Link from 'next/link';
import type { ReactNode } from 'react';

/* Posts live as typed modules rather than a CMS or MDX: there is one, it is
   written from what building this actually taught us, and a database would
   add a dependency without adding a reader. */

export interface Post {
  slug: string;
  title: string;
  description: string;
  published: string; // ISO date
  modified: string;
  readingMinutes: number;
  body: ReactNode;
}

const P = ({ children }: { children: ReactNode }) => <p className="text-gray-700 leading-7">{children}</p>;
const H2 = ({ children }: { children: ReactNode }) => (
  <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">{children}</h2>
);
const Code = ({ children }: { children: ReactNode }) => (
  <code className="font-mono text-[0.9em] bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded">{children}</code>
);

export const posts: Post[] = [
  {
    slug: 'what-carrier-tracking-pages-actually-say',
    title: 'What a carrier tracking page actually says, and why software keeps getting it wrong',
    description:
      'Six things we learned reading UPS, FedEx, USPS, DHL, Canada Post and Purolator tracking pages in production: numbers that collide, dates without years, and a page that says Delivered without saying when.',
    published: '2026-08-24',
    modified: '2026-08-24',
    readingMinutes: 7,
    body: (
      <>
        <P>
          CargoPax follows parcels by reading the same tracking pages you would read yourself. That sounds
          straightforward until you do it for every carrier at once. These are the six problems that actually
          came up, and what we do about each — written down because every one of them cost us a wrong answer
          first.
        </P>

        <H2>1. A tracking number is not a generic string</H2>
        <P>
          The tempting rule is &ldquo;a long-ish run of letters and digits is probably a tracking number&rdquo;.
          It is not. Shipping emails are full of long-ish runs of letters and digits: campaign identifiers,
          session tokens, unsubscribe hashes. Several of them sit on the carrier&rsquo;s own domain, because the
          carrier sent the marketing too.
        </P>
        <P>
          Carrier numbers have real formats, and using them turns guesswork into a test:
        </P>
        <ul className="list-disc list-inside text-gray-700 space-y-1 my-4">
          <li>
            <strong>UPS</strong> — <Code>1Z</Code> followed by 16 characters; also <Code>T</Code> plus 10 digits,
            and 18- or 22-digit Mail Innovations numbers
          </li>
          <li>
            <strong>FedEx</strong> — 12 digits, or 15, 20 or 22
          </li>
          <li>
            <strong>USPS</strong> — 20 to 26 digits, or the international <Code>XX999999999XX</Code> form
          </li>
          <li>
            <strong>DHL</strong> — 10 or 11 digits for Express, or a <Code>JD</Code>/<Code>GM</Code> prefix
          </li>
          <li>
            <strong>Canada Post</strong> — 16 digits, or the same international form
          </li>
          <li>
            <strong>Purolator</strong> — a 12-digit PIN, or 3–4 letters followed by 8–9 digits
          </li>
        </ul>
        <P>
          We tested this with a shipping email containing a genuine UPS link and a UPS marketing link whose
          campaign id was 24 hex characters. The length rule takes both. The format rule takes one.
        </P>

        <H2>2. The formats overlap, and pretending otherwise is worse than asking</H2>
        <P>
          Twelve digits is a FedEx number. Twelve digits is also a Purolator PIN. Twenty-two digits could be
          FedEx, USPS or UPS Mail Innovations. No amount of cleverness resolves that from the number alone —
          only the person holding the parcel knows who is carrying it.
        </P>
        <P>
          So when you paste a number into CargoPax, the carrier dropdown fills itself in when the format belongs
          to exactly one carrier, and asks you when it does not. Guessing would produce a tracker that quietly
          says &ldquo;not found&rdquo; forever, which looks like a broken product rather than an ambiguous
          number.
        </P>

        <H2>3. The page you want is rendered after the page loads</H2>
        <P>
          Fetching a carrier tracking URL over plain HTTP mostly returns an application shell: some markup, a
          pile of JavaScript, and no delivery date anywhere in it. The status arrives afterwards, from an
          internal API the page calls once it is running.
        </P>
        <P>
          That is why CargoPax drives a real browser. One recent read of a live UPS page came back as 1.7&nbsp;MB
          of HTML that reduced to 5,715 characters of actual text — and the delivery status was in the text, not
          the markup.
        </P>

        <H2>4. Dates arrive without years</H2>
        <P>
          Carriers write <em>Scheduled Delivery: Saturday, 08/30</em> or <em>Delivered On Thursday, 08/21 at
          2:14 P.M.</em> The year is absent because a human reading it in the moment does not need one.
          Software does. Stamp the current year on and every parcel delivered in late December becomes a
          delivery eleven months in the future, which then sorts to the top of a list of what is arriving next.
        </P>
        <P>
          We hand the model today&rsquo;s date and ask for ISO dates back, with the instruction that a scheduled
          delivery is in the near future and a completed one is in the recent past. Then we check what comes
          back is a real calendar date before it becomes an event — <Code>2026-02-30</Code> is not a date, no
          matter how confidently anything produces it.
        </P>

        <H2>5. Some pages say &ldquo;Delivered&rdquo; without saying when</H2>
        <P>
          UPS&rsquo;s own sample tracking number does exactly this. The page shows <em>Delivered</em>, a
          destination, and who signed for it. There is no delivery date anywhere on it. Under the &ldquo;Latest
          Update&rdquo; heading it says <em>No Information Available</em>.
        </P>
        <P>
          Our first version treated that as an error, because a delivery with no date failed validation. That
          was the wrong call: the parcel is definitively delivered, and the user cares far more about that than
          about the exact day. We now record it as delivered on the day we observed it, which is the most honest
          date available, and the shipment moves to Delivered where it belongs.
        </P>

        <H2>6. A search engine often reads the carrier better than the carrier does</H2>
        <P>
          For UPS, FedEx, USPS and DHL, a search engine&rsquo;s package-tracking answer box holds the same status
          in a fraction of the markup, and is far less hostile to automation than the carriers&rsquo; own pages.
          CargoPax tries that first for those four and falls back to the carrier page when the box is not there.
          It is not a trick so much as an acknowledgement that carrier sites are built for humans with cursors.
        </P>

        <H2>What this adds up to</H2>
        <P>
          Every one of these is small. Together they are the difference between a tracker that mostly works and
          one you stop checking, because the first time it shows a delivery date eleven months out, or a parcel
          stuck at &ldquo;not found&rdquo; because a marketing link got tracked instead of the shipment, you go
          back to opening the carrier email yourself.
        </P>
        <P>
          If you want to see it work on your own parcels,{' '}
          <Link href="/how-it-works" className="text-blue-700 underline">
            read how the forwarding address works
          </Link>{' '}
          — you forward a shipping email and the tracking happens without you pasting anything.
        </P>
      </>
    )
  }
];

export function getPost(slug: string): Post | undefined {
  return posts.find(post => post.slug === slug);
}

export function sortedPosts(): Post[] {
  return [...posts].sort((a, b) => b.published.localeCompare(a.published));
}
