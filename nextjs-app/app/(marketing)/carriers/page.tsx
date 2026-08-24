import Link from 'next/link';
import { breadcrumbSchema, JsonLd, pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  path: '/carriers',
  title: 'Carriers CargoPax tracks, and the number formats it recognises',
  description:
    'UPS, FedEx, USPS, DHL, Canada Post and Purolator: the tracking-number formats CargoPax matches, which ones overlap, and what it reads off each carrier’s page.'
});

const CARRIERS = [
  {
    name: 'UPS',
    formats: ['1Z + 16 characters', 'T + 10 digits (InfoNotice)', '18 or 22 digits (Mail Innovations)'],
    note: 'The 1Z form is unambiguous, so pasting one is enough on its own. Some UPS pages report a delivery without a date at all; CargoPax records those as delivered on the day it saw them rather than discarding the result.'
  },
  {
    name: 'FedEx',
    formats: ['12 digits', '15 digits', '20 digits', '22 digits'],
    note: 'Twelve digits is also a Purolator PIN, so a bare 12-digit number asks which carrier it belongs to.'
  },
  {
    name: 'USPS',
    formats: ['20–26 digits', 'XX999999999XX (international)'],
    note: 'The long numeric form overlaps with FedEx and with UPS Mail Innovations, so those are asked about too.'
  },
  {
    name: 'DHL',
    formats: ['10 or 11 digits (Express)', 'JD… or GM… (eCommerce)'],
    note: 'The 10-digit Express air waybill is distinctive enough to identify on its own.'
  },
  {
    name: 'Canada Post',
    formats: ['16 digits', 'XX999999999XX (international)'],
    note: 'The 16-digit domestic form belongs to Canada Post alone among the carriers here.'
  },
  {
    name: 'Purolator',
    formats: ['12-digit PIN', '3–4 letters + 8–9 digits'],
    note: 'Shares the 12-digit shape with FedEx, which is the most common ambiguity we see in Canadian shipping email.'
  }
];

export default function Carriers() {
  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Carriers', path: '/carriers' }
        ])}
      />

      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Carriers and number formats</h1>
      <p className="mt-4 text-lg text-gray-700 leading-8">
        CargoPax tracks these six carriers. It recognises them by the format of the tracking number, which is
        what lets it tell a real tracking link from the marketing links sitting beside it in the same email.
      </p>

      <div className="mt-8 space-y-6">
        {CARRIERS.map(carrier => (
          <section key={carrier.name} className="border border-gray-200 rounded-lg p-5">
            <h2 className="text-lg font-semibold text-gray-900">{carrier.name}</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {carrier.formats.map(format => (
                <li key={format} className="font-mono text-sm bg-gray-100 text-gray-800 px-2 py-1 rounded">
                  {format}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-gray-700 leading-7">{carrier.note}</p>
          </section>
        ))}
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">What gets read from a page</h2>
      <p className="text-gray-700 leading-7">
        For every carrier, CargoPax looks for the same five things: when the label was created, when the parcel
        started moving, when it went out for delivery, the estimated delivery date, and whether it has been
        delivered. Not every carrier shows all five, and a page that shows none of them is recorded as an error
        against that parcel rather than as a blank result, so you can see that the check happened and failed.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">A link on another site</h2>
      <p className="text-gray-700 leading-7">
        You can paste a tracking URL from a site that is not on this list. CargoPax will keep it and show it on
        your dashboard, but it will not open it or check it for updates — only these six carriers are read
        automatically.
      </p>

      <div className="mt-12 border-t border-gray-200 pt-8 text-gray-700">
        <p>
          More on why the formats matter:{' '}
          <Link href="/blog/what-carrier-tracking-pages-actually-say" className="text-blue-700 underline">
            what a carrier tracking page actually says
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
