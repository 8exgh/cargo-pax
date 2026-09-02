import Link from 'next/link';
import { breadcrumbSchema, JsonLd, pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  path: '/faq',
  title: 'CargoPax package tracking FAQ',
  description:
    'Answers about forwarding shipping emails, supported carriers, shared access, privacy, notifications and what CargoPax can and cannot track.',
  keywords: ['CargoPax FAQ', 'email package tracking questions', 'shared parcel tracker help']
});

const FAQS = [
  {
    question: 'What is CargoPax?',
    answer:
      'CargoPax is a shared package tracker built around email forwarding. Your organization gets a dedicated mailbox; shipping messages sent there become parcels on a shared dashboard and are checked for delivery updates.'
  },
  {
    question: 'Which shipping carriers are supported?',
    answer:
      'CargoPax automatically follows UPS, FedEx, USPS, DHL, Canada Post and Purolator. It recognizes carrier-specific tracking-number formats and asks you to choose when a bare number could belong to more than one carrier.'
  },
  {
    question: 'Do I have to forward an email to add a package?',
    answer:
      'No. A signed-in admin can paste a supported carrier tracking link or tracking number into the dashboard. Forwarding is the easier intake method when the shipping message already contains the link and order context.'
  },
  {
    question: 'Does CargoPax connect to my Gmail, Outlook or work inbox?',
    answer:
      'No. CargoPax does not request credentials or an OAuth connection to the mailbox where you receive orders. It only sees messages you deliberately forward to the separate CargoPax mailbox assigned to your organization.'
  },
  {
    question: 'What information is read from a forwarded email?',
    answer:
      'CargoPax processes the forwarded message to find supported carrier links and uses its text to create a useful shipment label. The parsed message is stored so organization members can see which source email produced a shipment.'
  },
  {
    question: 'Can several people share the same package list?',
    answer:
      'Yes. An administrator can invite members to the organization. Everyone sees the same shipments; read-only members can also request a fresh status check, while admins manage shipments, groups, organization settings and membership.'
  },
  {
    question: 'Which delivery updates does CargoPax show?',
    answer:
      'CargoPax looks for label created, on the way, out for delivery, estimated delivery date and delivered milestones. The exact journey depends on what the carrier page makes available.'
  },
  {
    question: 'How do notifications work?',
    answer:
      'Shipment changes are sent by email and can also be delivered as web push notifications. On iPhone and iPad, web notifications require adding CargoPax to the Home Screen, because Apple does not deliver them to an ordinary Safari tab.'
  },
  {
    question: 'Can one forwarded email create more than one shipment?',
    answer:
      'Yes. If a shipping message contains several valid links for supported carriers, CargoPax can create a tracker for each one rather than treating the whole order as one box.'
  },
  {
    question: 'Is CargoPax a mailroom or inventory system?',
    answer:
      'No. CargoPax tracks parcels while they are with the carrier. It does not scan packages at reception, collect recipient signatures, assign lockers, manage stock or prove the final handoff after a carrier marks a parcel delivered.'
  },
  {
    question: 'What happens when a carrier page cannot be read?',
    answer:
      'The shipment shows an error instead of silently presenting an old result as current. A member can request another check, and a later successful refresh clears the parsing error.'
  }
];

export default function FrequentlyAskedQuestions() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer }
    }))
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <JsonLd data={faqSchema} />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'FAQ', path: '/faq' }
        ])}
      />

      <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Frequently asked questions</h1>
      <p className="mt-4 text-lg leading-8 text-gray-700">
        The practical details of turning shipping emails into a shared parcel list — including the boundaries and
        failure cases.
      </p>

      <dl className="mt-10 divide-y divide-gray-200 border-y border-gray-200">
        {FAQS.map(item => (
          <div key={item.question} className="py-6">
            <dt className="text-lg font-semibold text-gray-900">{item.question}</dt>
            <dd className="mt-2 text-gray-700 leading-7">{item.answer}</dd>
          </div>
        ))}
      </dl>

      <aside className="mt-12 rounded-xl bg-blue-50 p-6 text-gray-700">
        <h2 className="text-xl font-semibold text-gray-900">Want the longer version?</h2>
        <p className="mt-2 leading-7">
          Read exactly{' '}
          <Link href="/how-it-works" className="text-blue-700 underline">how a forwarded message becomes a tracker</Link>,{' '}
          review the{' '}
          <Link href="/carriers" className="text-blue-700 underline">carrier number formats</Link>, or see{' '}
          <Link href="/privacy" className="text-blue-700 underline">what CargoPax stores</Link>.
        </p>
      </aside>
    </article>
  );
}
