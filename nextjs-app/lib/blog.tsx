import Link from 'next/link';
import type { ReactNode } from 'react';

/* Posts live as typed modules rather than a CMS or MDX. They are all known at
   build time, so keeping the content here gives readers static HTML without
   adding a content service to a small application. */

export interface Post {
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  published: string; // ISO date
  modified: string;
  readingMinutes: number;
  category: string;
  audience: string;
  topics: string[];
  body: ReactNode;
}

const P = ({ children }: { children: ReactNode }) => <p className="text-gray-700 leading-7">{children}</p>;
const H2 = ({ children }: { children: ReactNode }) => (
  <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">{children}</h2>
);
const H3 = ({ children }: { children: ReactNode }) => (
  <h3 className="text-lg font-semibold text-gray-900 mt-7 mb-2">{children}</h3>
);
const Code = ({ children }: { children: ReactNode }) => (
  <code className="font-mono text-[0.9em] bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded">{children}</code>
);

export const posts: Post[] = [
  {
    slug: 'track-package-without-tracking-number',
    title: 'How to track a UPS or FedEx package without a tracking number',
    seoTitle: 'Track a UPS or FedEx package without a tracking number',
    description:
      'Lost the tracking number, or never had it? Every way to find it or work around it: the shipping email, the order page, UPS My Choice and FedEx Delivery Manager, reference numbers, the sender, and a forwarding address that means you never need the number again.',
    published: '2026-09-04',
    modified: '2026-09-04',
    readingMinutes: 7,
    category: 'UPS & FedEx',
    audience: 'Anyone waiting on a parcel they cannot look up',
    topics: [
      'track package without tracking number',
      'lost UPS tracking number',
      'track FedEx package without tracking number',
      'find tracking number in email',
      'UPS My Choice',
      'FedEx Delivery Manager'
    ],
    body: (
      <>
        <P>
          The carrier sites are blunt about it: you cannot look up a parcel on ups.com or fedex.com without its
          tracking number. What they do not say is that you almost certainly have the number already, and that
          both carriers offer a way to see parcels headed to your address without typing a number at all. Here
          are the routes, fastest first, and one way to stop needing the number altogether.
        </P>

        <H2>1. It is in the shipping email, even when you cannot see it</H2>
        <P>
          Every retailer sends a message when the parcel leaves. Search your inbox for the store&rsquo;s name
          together with &ldquo;shipped&rdquo;, &ldquo;on its way&rdquo;, or &ldquo;tracking&rdquo;. The number is
          usually printed under a heading like &ldquo;Track your package&rdquo;, and it looks like one of a few
          shapes: <Code>1Z</Code> followed by sixteen letters and digits for UPS, twelve or fifteen digits for
          FedEx, twenty to twenty-two digits starting with 9 for USPS, sixteen digits for Canada Post.
        </P>
        <P>
          Sometimes the email shows only a button. The number is still there; it is inside the link. On a phone,
          press and hold the button and choose copy link, then paste it somewhere you can read it. On a computer,
          hover the button and read the address in the corner of the browser. The long token after{' '}
          <Code>tracknum=</Code>, <Code>trackingnumber=</Code>, or <Code>tracknumbers=</Code> is the number. Paste
          the whole link into CargoPax and it pulls the number out for you; the{' '}
          <Link href="/carriers" className="text-blue-700 underline">
            carriers page
          </Link>{' '}
          lists which links it understands.
        </P>

        <H2>2. The retailer&rsquo;s order page keeps it when the email is gone</H2>
        <P>
          If the message was deleted or went to someone else&rsquo;s inbox, the order itself still exists. Sign in
          to the store, open your orders, and look for a track button or a shipment section. Large marketplaces
          show the carrier and number on the order; most independent stores run a hosted order-status page that
          shows the same thing. This is also the place to look when a single order shipped in more than one box,
          because each box has its own number and the email often lists only the first.
        </P>

        <H2>3. Let the carrier show you what is coming to your address</H2>
        <P>
          This is the answer to the literal question. Both major carriers run a free service that lists parcels
          addressed to you, without you supplying a number.
        </P>
        <H3>UPS My Choice</H3>
        <P>
          A UPS My Choice account, once your address is confirmed, shows UPS parcels headed to that address and
          sends delivery alerts as they move. It is free at the basic level. It also lets you change delivery
          options for eligible shipments, which the plain tracking page does not. UPS describes its tracking
          options, including reference tracking, in its{' '}
          <a href="https://www.ups.com/us/en/support/tracking-support" className="text-blue-700 underline">
            tracking support guide
          </a>
          .
        </P>
        <H3>FedEx Delivery Manager</H3>
        <P>
          <a href="https://www.fedex.com/en-ca/delivery-manager.html" className="text-blue-700 underline">
            FedEx Delivery Manager
          </a>{' '}
          works the same way: sign up, confirm your address, and shipments to it appear with their status and
          numbers, at no extra charge, with the option to redirect a delivery to a FedEx location if you will not
          be home.
        </P>
        <P>
          Two limits apply to both. They show parcels only after the carrier has received the shipment data, so a
          box the retailer has not handed over yet will not be there. And they show parcels addressed to the
          address you verified, so a delivery going to the office, a parent&rsquo;s house, or a parcel locker will
          not appear on your home account.
        </P>

        <H2>4. Track by reference number</H2>
        <P>
          When a shipper creates a label they can attach a reference: usually your order number, sometimes a
          purchase-order or invoice number. UPS and FedEx both let you look a parcel up by that reference instead
          of the tracking number, typically together with the ship date range and the destination postal code.
          FedEx exposes this on its{' '}
          <a href="https://www.fedex.com/en-us/tracking/advanced.html" className="text-blue-700 underline">
            advanced tracking page
          </a>
          ; UPS offers it from its tracking page. It works only when the shipper actually attached a reference,
          which large retailers usually do and small ones often do not.
        </P>

        <H2>5. Ask the person who sent it</H2>
        <P>
          The sender has the number on the receipt and on the label. A gift, a marketplace purchase from an
          individual, or a return shipment from a repair shop are the cases where this is the fastest route, and
          the sender can usually paste it from their own confirmation in seconds. If a UPS driver left a slip on
          the door, the InfoNotice number printed on it, a letter followed by ten digits, tracks the parcel on its
          own.
        </P>

        <H2>6. Stop needing the number</H2>
        <P>
          Every route above is a search for a string of characters that was in your email the whole time. The
          reason it feels like work is that the number has to be copied from where it arrived to where you check
          it, once per parcel, for every parcel, by whoever happened to get the message.
        </P>
        <P>
          CargoPax removes that step. Each account gets its own forwarding address at cargopax.ca. Forward the
          shipping email to it, or set a rule in your mail client to forward store messages automatically, and the
          number is read out of the message, the carrier is identified, and the parcel is added to one list that
          updates as the carrier posts scans and emails you when something changes. Nobody types a number. Nobody
          looks up which site to type it into. If several people at home or at work receive shipping emails, they
          all forward to the same address and see the same list.
        </P>
        <P>
          Forwarding a message is not the same as connecting your inbox; the tracker sees only what you send it.
          The trade-offs between the two are in{' '}
          <Link href="/blog/track-packages-from-email-without-inbox-access" className="text-blue-700 underline">
            our post on tracking from email without inbox access
          </Link>
          . And when you do have a bare number, pasting it works too: the carrier is worked out from the
          number&rsquo;s format, and you are asked to choose only when two carriers use the same shape.
        </P>

        <H2>When you have the number and it still says nothing</H2>
        <P>
          A number that returns &ldquo;not found&rdquo; or sits at &ldquo;label created&rdquo; is usually a parcel
          the carrier has not picked up yet, not a wrong number. FedEx says as much in its{' '}
          <a
            href="https://www.fedex.com/en-ca/contact-us/faq/track-packages/package-status/no-updates.html"
            className="text-blue-700 underline"
          >
            guide to shipments with no updates
          </a>
          . Give it a business day. What each status means and when to worry is covered in{' '}
          <Link href="/blog/track-ups-fedex-tracking-numbers" className="text-blue-700 underline">
            how to track UPS and FedEx numbers in one place
          </Link>
          .
        </P>

        <H2>Quick answers</H2>
        <H3>Can I track a UPS package by address?</H3>
        <P>
          Not from the public tracking page, but a free UPS My Choice account tied to your verified address lists
          the UPS parcels headed there.
        </P>
        <H3>Can I track a FedEx package by name or address?</H3>
        <P>
          Through FedEx Delivery Manager, yes, for the address you verified. Without an account, FedEx needs the
          tracking number or a shipper reference with a date range and destination.
        </P>
        <H3>What does a tracking number look like?</H3>
        <P>
          UPS: <Code>1Z</Code> plus sixteen characters. FedEx: twelve or fifteen digits, sometimes twenty or
          twenty-two. USPS: twenty to twenty-two digits beginning with 9. Canada Post: sixteen digits, or two
          letters, nine digits and <Code>CA</Code> for international. Purolator: a twelve-digit PIN.
        </P>
      </>
    )
  },
  {
    slug: 'track-ups-fedex-tracking-numbers',
    title: 'How to track UPS and FedEx tracking numbers in one place',
    seoTitle: 'Track UPS and FedEx tracking numbers in one place',
    description:
      'Track UPS and FedEx tracking numbers without juggling carrier tabs. Learn the quickest workflow for checking, organizing and sharing package updates.',
    published: '2026-09-04',
    modified: '2026-09-04',
    readingMinutes: 7,
    category: 'UPS & FedEx',
    audience: 'Online shoppers, households and small teams',
    topics: [
      'UPS tracking number',
      'FedEx tracking number',
      'track UPS and FedEx packages',
      'UPS and FedEx tracking in one place'
    ],
    body: (
      <>
        <P>
          A UPS tracking number and a FedEx tracking number solve the same basic problem: each tells you where a
          package is and what should happen next. The inconvenience begins when the numbers are scattered across
          order emails, text messages and two carrier websites — especially when several people need the answer.
        </P>
        <P>
          The quickest approach is simple. Use the carrier page when you need to manage one delivery. Use one
          package list when you need to remember several UPS and FedEx shipments, recognize what is inside them,
          or share their progress with somebody else.
        </P>

        <H2>How to track a UPS tracking number</H2>
        <P>
          Copy the number from the retailer&rsquo;s shipping confirmation or the message from UPS, open the{' '}
          <a href="https://www.ups.com/track" className="text-blue-700 underline">
            official UPS tracking page
          </a>{' '}
          and paste it into the tracking field. UPS says its own tracking page provides the most up-to-date
          information about a shipment. For a familiar small-package number, look for <Code>1Z</Code> followed by
          16 letters and digits. UPS also uses other formats for services such as InfoNotice and Mail Innovations,
          as its{' '}
          <a href="https://www.ups.com/us/en/support/tracking-support" className="text-blue-700 underline">
            tracking support guide
          </a>{' '}
          explains.
        </P>
        <P>
          The result may show that UPS has received only the shipment details, that the parcel is on the way, that
          it is out for delivery or that it has been delivered. If you need to reroute the parcel, correct an
          address, request a hold or see every scan, continue on UPS. A multi-carrier tracker is useful for the
          overview; the carrier remains the place for delivery controls.
        </P>

        <H2>How to track a FedEx tracking number</H2>
        <P>
          Find the tracking ID in the shipping message, then enter it on the{' '}
          <a href="https://www.fedex.com/en-ca/tracking.html" className="text-blue-700 underline">
            official FedEx tracking page
          </a>
          . FedEx&rsquo;s page can show the current status, an estimated delivery window when available, and options
          for email, text or app notifications. It may also offer a hold at a FedEx retail location or other
          delivery choices for an eligible shipment.
        </P>
        <P>
          Do not assume a new FedEx tracking number is broken just because it has no scans. FedEx explains in its{' '}
          <a
            href="https://www.fedex.com/en-ca/contact-us/faq/track-packages/package-status/no-updates.html"
            className="text-blue-700 underline"
          >
            guide to tracking numbers without updates
          </a>{' '}
          that shipment details appear after it receives the package; a retailer can create the number while the
          box is still at the sender&rsquo;s location. A pause at &ldquo;label created&rdquo; can therefore be a handoff
          delay, not a tracking failure.
        </P>

        <H2>How to track UPS and FedEx packages in one place</H2>
        <P>
          Repeating the two lookups above works for an occasional order. It becomes surprisingly easy to lose
          track when one purchase is split into three boxes, UPS is delivering office supplies, and FedEx is
          carrying the part somebody needs tomorrow. A combined list removes the memory work.
        </P>
        <div className="my-5 rounded-lg border border-gray-200 bg-gray-50 p-5">
          <ol className="list-decimal pl-5 text-gray-700 space-y-3 leading-7">
            <li>Paste each UPS or FedEx tracking number into CargoPax, or forward the original shipping email.</li>
            <li>Give the parcel a useful name such as &ldquo;reception printer&rdquo; or &ldquo;Mara&rsquo;s replacement laptop&rdquo;.</li>
            <li>Check one dashboard for what is moving, arriving next or already delivered.</li>
            <li>Let email or device notifications bring important status changes to you.</li>
          </ol>
        </div>
        <P>
          Forwarding is often the most convenient intake method because the carrier link and tracking number are
          already in the message. CargoPax receives only the shipping emails you choose to send to your tracking
          address; it does not need access to search your personal or work inbox. If you already have the number,
          pasting it is just as valid.
        </P>

        <H2>Why CargoPax may ask which carrier you have</H2>
        <P>
          A typical UPS number beginning with <Code>1Z</Code> identifies itself clearly. Numeric tracking numbers
          can be less obvious. A 12-digit number, for example, can fit both FedEx and Purolator, while longer
          numeric formats can overlap across several carriers. Guessing would risk following the wrong page and
          reporting no result.
        </P>
        <P>
          CargoPax selects the carrier when the number format is distinctive and asks you to choose when it is
          not. You can avoid the question by pasting the original carrier link, because its UPS or FedEx domain
          settles the answer. See the complete list of{' '}
          <Link href="/carriers" className="text-blue-700 underline">
            supported carrier tracking-number formats
          </Link>
          .
        </P>

        <H2>What one package list makes easier</H2>
        <ul className="list-disc pl-6 text-gray-700 space-y-2 my-4 leading-7">
          <li>
            <strong>Less tab switching:</strong> UPS and FedEx shipments appear in the same view even though each
            carrier still has its own tracking system.
          </li>
          <li>
            <strong>Names instead of numbers:</strong> a label tells you what is arriving without reopening the
            retailer&rsquo;s order email.
          </li>
          <li>
            <strong>One notification habit:</strong> you do not need to configure alerts separately for every
            package on every carrier.
          </li>
          <li>
            <strong>Shared visibility:</strong> a household or team can see the same incoming deliveries without
            forwarding every status update to one another.
          </li>
          <li>
            <strong>A short delivery history:</strong> when a box seems missing, you can first confirm whether it
            was marked delivered and on what day.
          </li>
        </ul>

        <H2>Why is my UPS or FedEx tracking number not working?</H2>
        <P>
          First, copy the number again without surrounding punctuation. CargoPax removes ordinary spaces and
          dashes, but it cannot repair a missing digit. Next, check whether the sender has handed the parcel to
          the carrier. A created label is not the same as a carrier pickup, and the first useful scan may take
          time to appear. Also look for a second number: retailers often split one order into several packages.
        </P>
        <P>
          If the number still produces no result, open the shipping email&rsquo;s original tracking link. That
          confirms the carrier and takes you to its source record. FedEx notes that scans can be more than 24
          hours apart during long-distance travel in its{' '}
          <a
            href="https://www.fedex.com/en-ca/contact-us/faq/track-packages/package-status/package-not-moving.html"
            className="text-blue-700 underline"
          >
            explanation of packages that are not moving
          </a>, so a package that has not changed today is not necessarily stuck. Contact the seller or carrier when
          the source page reports an exception, a missed delivery or a delivered package you cannot find.
        </P>

        <H2>Can I track UPS and FedEx without an account?</H2>
        <P>
          You can enter an individual tracking number on the public UPS or FedEx tracking page without creating
          a carrier account. Carrier accounts become useful when you want their enhanced delivery-management
          features. CargoPax is the better fit when the job is keeping packages from different carriers in one
          recognizable, shareable list.
        </P>

        <H2>The convenient rule of thumb</H2>
        <P>
          Keep the carrier sites as the source of detail and control. Use CargoPax as the place you remember what
          is coming. Forward the shipping email when it arrives, name the package for the person who cares about
          it, and let the next meaningful update come to you.
        </P>
        <P>
          If UPS and FedEx are only part of the mix, CargoPax also supports USPS, DHL, Canada Post and Purolator.
          Read how to{' '}
          <Link href="/blog/track-multiple-packages-in-one-place" className="text-blue-700 underline">
            track multiple packages in one place
          </Link>{' '}
          or{' '}
          <Link href="/how-it-works" className="text-blue-700 underline">
            see how email forwarding becomes package tracking
          </Link>
          .
        </P>
      </>
    )
  },
  {
    slug: 'track-multiple-packages-in-one-place',
    title: 'How to track multiple packages in one place (without another spreadsheet)',
    seoTitle: 'How to track multiple packages in one place',
    description:
      'A practical comparison of carrier tabs, inbox search, tracking apps and email forwarding for anyone juggling deliveries from more than one store or courier.',
    published: '2026-09-02',
    modified: '2026-09-02',
    readingMinutes: 8,
    category: 'Guide',
    audience: 'Frequent shoppers and small teams',
    topics: ['track multiple packages', 'all-in-one package tracking', 'multi-carrier package tracking'],
    body: (
      <>
        <P>
          One package is easy: open the message from the shop and follow its link. The problem changes when five
          orders become seven boxes and those boxes move through UPS, FedEx, Canada Post and Purolator. Now the
          job is not looking up a number. It is remembering which numbers exist, which person ordered each thing,
          and which delivery has actually changed.
        </P>
        <P>
          There are four sensible ways to track multiple packages. The right one depends less on how many carrier
          logos a tool supports and more on how the tracking information enters the system.
        </P>

        <H2>The four workable approaches</H2>
        <div className="my-5 overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-900">
              <tr>
                <th className="px-4 py-3 font-semibold">Method</th>
                <th className="px-4 py-3 font-semibold">Best for</th>
                <th className="px-4 py-3 font-semibold">The trade-off</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-700">
              <tr>
                <td className="px-4 py-3 font-medium text-gray-900">Carrier websites</td>
                <td className="px-4 py-3">One or two active parcels</td>
                <td className="px-4 py-3">Authoritative, but every carrier is a separate tab and notification list.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-gray-900">Inbox features</td>
                <td className="px-4 py-3">Personal orders already in one mailbox</td>
                <td className="px-4 py-3">Convenient, but tied to one email provider and usually one person.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-gray-900">Tracking app</td>
                <td className="px-4 py-3">Broad carrier coverage and mobile use</td>
                <td className="px-4 py-3">Automatic import may require mailbox access; manual import still means copying numbers.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-gray-900">Email forwarding</td>
                <td className="px-4 py-3">A deliberate, shareable workflow</td>
                <td className="px-4 py-3">You forward each shipping message, or carefully configure a mail rule.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <H2>Option 1: keep using the carrier sites</H2>
        <P>
          This is the baseline and it is often good enough. Keep the shipping messages, open the UPS or FedEx
          link when you care, and let each carrier send its own alerts. You are seeing the carrier&rsquo;s source
          record, with all of the scans and delivery controls it chooses to expose.
        </P>
        <P>
          The method breaks down through fragmentation. A search for &ldquo;desk chair&rdquo; in your inbox might
          find the order receipt but not the later carrier message. Split shipments create several tracking
          numbers for one purchase. And a colleague cannot see what is coming unless you forward the updates to
          them too. Carrier tabs are a lookup system, not a shared list.
        </P>

        <H2>Option 2: use the tracking already in your inbox</H2>
        <P>
          Some inboxes can identify shipping messages for you. Google, for example, documents package status and
          estimated arrival cards in Gmail for participating carriers in the United States. It is convenient
          because the order email is already there, though{' '}
          <a
            href="https://support.google.com/mail/answer/13073650?hl=en"
            className="text-blue-700 underline"
          >
            Google&rsquo;s current help page
          </a>{' '}
          describes the feature as US-only and says it depends on smart features being enabled.
        </P>
        <P>
          Inbox tracking is a strong personal default. It is less useful when orders arrive in several inboxes,
          your team does not share an email provider, or the person receiving the parcel is not the person who
          bought it.
        </P>

        <H2>Option 3: use a universal package tracking app</H2>
        <P>
          This is the broad-coverage answer. Universal trackers normalize many carrier statuses into one list,
          send notifications and often detect a carrier from its tracking number. Some can import orders after
          you connect Gmail or Outlook; others let you paste numbers or forward messages. AfterShip, for example,
          documents both email linking and forwarding in{' '}
          <a
            href="https://support.aftership.com/en/tracking/articles/15441927-introduction-to-aftership-mobile-app"
            className="text-blue-700 underline"
          >
            its current mobile-app guide
          </a>
          .
        </P>
        <P>
          Choose this route when international carrier breadth matters most. Before connecting an inbox, check
          what permission is requested, what is retained, whether you can add another person, and whether the
          product is for incoming purchases or for merchants sending orders to customers. Both are called
          &ldquo;multi-carrier tracking,&rdquo; but they solve different jobs.
        </P>

        <H2>Option 4: forward shipping emails to one tracking address</H2>
        <P>
          Forwarding keeps the automation but makes the boundary explicit. Instead of authorizing a service to
          search an inbox, you send the one message it needs. The tracking address becomes a collection point:
          you, a colleague or a family member can all forward shipping notices into the same parcel list.
        </P>
        <P>
          That is the CargoPax model. Each organization gets its own <Code>@cargopax.ca</Code> inbox. CargoPax
          checks the message for links containing a real number in the named carrier&rsquo;s format, creates the
          shipment, follows its page and reports status changes. If forwarding by hand gets repetitive, a narrow
          rule for known order senders can automate it without forwarding the rest of your mail.
        </P>

        <H2>What to look for in any multi-package tracker</H2>
        <ul className="list-disc pl-6 text-gray-700 space-y-2 my-4 leading-7">
          <li>
            <strong>Fast capture:</strong> a list is only complete if adding the next package is easier than
            forgetting it.
          </li>
          <li>
            <strong>Clear ownership:</strong> &ldquo;printer ink&rdquo; is more useful than a 22-digit number,
            especially in a shared view.
          </li>
          <li>
            <strong>Honest carrier detection:</strong> number formats overlap. A good tool asks when the number
            alone cannot settle the carrier.
          </li>
          <li>
            <strong>Useful milestones:</strong> label created, moving, out for delivery and delivered are easier
            to scan than six carriers&rsquo; different vocabulary.
          </li>
          <li>
            <strong>Visible failures:</strong> &ldquo;the check failed&rdquo; is actionable; a stale status that looks
            current is not.
          </li>
          <li>
            <strong>The right sharing model:</strong> decide whether the list belongs to a phone, an inbox or a
            group of people.
          </li>
        </ul>

        <H2>A simple rule of thumb</H2>
        <P>
          For one person with occasional deliveries, use the inbox and carrier tools you already have. For a
          person who orders internationally, choose breadth. For a household or small team that needs the same
          answer to &ldquo;what is arriving?&rdquo;, choose a shared list and make forwarding the intake habit.
        </P>
        <P>
          CargoPax is deliberately built for that last case. See the{' '}
          <Link href="/shared-package-tracking" className="text-blue-700 underline">
            shared package tracking workflow
          </Link>{' '}
          or start by forwarding one real shipping email.
        </P>
      </>
    )
  },
  {
    slug: 'shared-package-tracking-workflow-for-small-teams',
    title: 'A shared package tracking workflow for small teams',
    seoTitle: 'Shared package tracking for small teams',
    description:
      'A lightweight way for offices, studios, clinics and field teams to know what is arriving, who ordered it and when someone should be ready for it.',
    published: '2026-08-31',
    modified: '2026-08-31',
    readingMinutes: 7,
    category: 'Teams',
    audience: 'Office managers and operations teams',
    topics: ['shared package tracking', 'business package tracker', 'incoming delivery tracking'],
    body: (
      <>
        <P>
          Small-team delivery tracking usually begins as an accidental system. The person who placed the order
          has the email. Someone else answers the door. A third person needs the equipment inside the box. The
          only shared record is a message in chat asking, &ldquo;Did that arrive yet?&rdquo;
        </P>
        <P>
          You do not need a warehouse platform to fix that. You need a reliable intake step, one visible list,
          and a small set of rules for naming and closing shipments.
        </P>

        <H2>Who benefits from a shared parcel list</H2>
        <P>
          The useful dividing line is not company size. It is whether ordering, receiving and using the item are
          done by different people. That shows up in design studios ordering samples, clinics receiving supplies,
          trades waiting on parts, nonprofits ordering event materials, property teams coordinating equipment,
          and small offices where anyone near the door becomes the receiver.
        </P>
        <P>
          Canadian ecommerce is not shrinking back into a single-carrier world. Canada Post&rsquo;s 2025 annual
          report says the domestic ecommerce market is projected to double over the next decade while competition
          among parcel carriers is intensifying. The operational result for a small team is simple: more purchases
          can arrive through more carrier systems.{' '}
          <a
            href="https://www.canadapost-postescanada.ca/cpc/en/our-company/financial-and-sustainability-reports/2025-annual-report/executive-summary.page"
            className="text-blue-700 underline"
          >
            Read Canada Post&rsquo;s executive summary
          </a>
          .
        </P>

        <H2>The five-step workflow</H2>
        <H3>1. Give incoming parcels one destination</H3>
        <P>
          Pick a tracking inbox that represents the team, not an employee. Every buyer forwards the dispatch or
          carrier message there. A dedicated address is easier to remember and easier to hand over when roles
          change than a spreadsheet owned by one person.
        </P>

        <H3>2. Name shipments for the person waiting</H3>
        <P>
          A tracking number is an identifier for a carrier, not a useful label for a team. Use a short label such
          as &ldquo;laser toner — Mara&rdquo;, &ldquo;site 14 fasteners&rdquo; or &ldquo;September event signs&rdquo;.
          Include the project, location or person that will make the parcel recognizable at a glance.
        </P>

        <H3>3. Let most people view, not administer</H3>
        <P>
          Everyone who depends on deliveries should be able to see them and request a current status. Far fewer
          people need to delete trackers, rename the organization or manage members. Read-only access keeps the
          shared view dependable without making it private to operations.
        </P>

        <H3>4. Act on milestones, not every scan</H3>
        <P>
          A depot scan at 2:14 a.m. rarely changes someone&rsquo;s day. &ldquo;Out for delivery&rdquo; might. Decide
          which milestones cause action: prepare access, tell the site lead, clear a receiving area or follow up
          because an estimate slipped. A useful tracking system reduces notification noise instead of reproducing
          every carrier event.
        </P>

        <H3>5. Keep delivered shipments as a short history</H3>
        <P>
          Delivery status answers the first question when an item seems missing: did the carrier mark it
          delivered, and on what day? Keep enough history to answer that before deleting or archiving the entry.
          The tracking list is not inventory, but it is useful evidence during the handoff from carrier to team.
        </P>

        <H2>A weekly operating pattern</H2>
        <div className="my-5 rounded-lg border border-gray-200 bg-gray-50 p-5">
          <ul className="space-y-3 text-gray-700 leading-7">
            <li><strong>When you order:</strong> wait for the shipping message, then forward it and check the label.</li>
            <li><strong>Each morning:</strong> scan what is out for delivery and tell anyone who needs to receive it.</li>
            <li><strong>When a date moves:</strong> update the project or person depending on the arrival.</li>
            <li><strong>When it arrives:</strong> confirm the physical handoff before treating &ldquo;Delivered&rdquo; as complete.</li>
            <li><strong>Once a week:</strong> review old or errored trackers and clean up what no longer matters.</li>
          </ul>
        </div>

        <H2>What CargoPax covers — and what it does not</H2>
        <P>
          CargoPax gives an organization one forwarding mailbox and one shipment dashboard. Members see the same
          shipments, read-only members can request a fresh check, and admins manage trackers and people. It
          follows UPS, FedEx, USPS, DHL, Canada Post and Purolator and sends milestone updates by email or device
          notification.
        </P>
        <P>
          It is for inbound visibility before the carrier reaches you. It is not a mailroom receiving log: it
          does not scan labels at the front desk, collect recipient signatures, assign lockers or prove that a
          parcel reached its final person. If your risk begins after the driver drops the box, use a proper
          mailroom system. If the recurring question is &ldquo;what is coming and when?&rdquo;, a shared tracker is the
          smaller, better fit.
        </P>

        <H2>Start with the workflow, not the software</H2>
        <P>
          Write one sentence your team can follow: &ldquo;When a supplier sends a shipping notice, forward it to
          this address and rename the parcel for the project.&rdquo; If that habit works, the list stays trustworthy.
          If it does not, adding integrations only automates an incomplete process.
        </P>
        <P>
          For the product-level version, visit{' '}
          <Link href="/shared-package-tracking" className="text-blue-700 underline">
            shared package tracking for small teams
          </Link>
          .
        </P>
      </>
    )
  },
  {
    slug: 'track-packages-from-email-without-inbox-access',
    title: 'How to track packages from email without giving an app your inbox',
    seoTitle: 'Track packages from email without inbox access',
    description:
      'Email can automate package tracking in three different ways. Here is what inbox scanning, manual entry and selective forwarding actually expose.',
    published: '2026-08-28',
    modified: '2026-08-28',
    readingMinutes: 7,
    category: 'Privacy',
    audience: 'Privacy-conscious shoppers and teams',
    topics: ['email package tracking', 'package tracker privacy', 'track packages without email access'],
    body: (
      <>
        <P>
          The useful part of a shipping email is tiny: usually a merchant name, a carrier and one tracking link.
          Yet the easiest way for software to find that information is often to ask for read access to the inbox
          containing everything else.
        </P>
        <P>
          That does not make inbox-connected package trackers inherently unsafe. OAuth access can be read-only,
          revocable and carefully operated. It does mean you should understand the boundary you are accepting —
          and know that selective email forwarding is another way to get most of the convenience.
        </P>

        <H2>Three ways to get a shipping email into a tracker</H2>
        <H3>1. Connect the whole inbox</H3>
        <P>
          With a connected account, the tracker searches for order and shipping messages as they arrive. This is
          the lowest-effort method once set up, and it can recover older orders. Route&rsquo;s documentation, for
          example, says automatic tracking uses read-only access to connected email accounts and extracts order
          information from relevant messages.{' '}
          <a
            href="https://shoppers.help.route.com/hc/en-us/articles/6045160006679-Route-mobile-app-data-and-privacy-FAQ"
            className="text-blue-700 underline"
          >
            Route explains its access here
          </a>
          .
        </P>
        <P>
          &ldquo;Read-only&rdquo; is an important limit: the app cannot send or delete mail. It still means the
          service has permission to read enough of the mailbox to find relevant messages. Review the exact scope,
          retention policy, deletion controls and security practices rather than treating the word read-only as
          the whole privacy answer.
        </P>

        <H3>2. Paste the tracking number yourself</H3>
        <P>
          Manual entry shares the least email data because the tracker receives no email at all. It receives the
          carrier, tracking number and whatever label you add. This is the clearest choice for a rare or sensitive
          shipment, and the easiest to understand.
        </P>
        <P>
          The cost is completeness. A tracker that depends on copying every number tends to miss the parcel added
          while you were on a phone, the second number in a split shipment, or the order made by somebody else.
          Manual entry protects the boundary by making you do every handoff.
        </P>

        <H3>3. Forward only the shipping message</H3>
        <P>
          Selective forwarding moves the permission decision from the account level to the message level. The
          tracker does not receive a key to your inbox. It receives the complete contents of the messages you
          deliberately send to its address, just as any email recipient would.
        </P>
        <P>
          That last sentence matters: forwarding is not the same as sharing only a tracking number. A shipping
          message can include your name, delivery area, order details and parts of the earlier conversation. Trim
          the thread before forwarding if it contains anything the tracking service does not need, and read what
          the service says it stores.
        </P>

        <H2>Why the permission question matters</H2>
        <P>
          People routinely make this trade-off outside package tracking. In Consumer Reports&rsquo; 2025
          cyber-readiness survey, four in five US adults said they adjust smartphone permissions when an app does
          not need access to something such as contacts, location or the camera.{' '}
          <a
            href="https://innovation.consumerreports.org/2025-Consumer-Cyber-Readiness-Report.pdf"
            className="text-blue-700 underline"
          >
            See the survey and methodology
          </a>
          . The relevant principle is data minimization: give a tool the information required for the job, with a
          scope you can explain later.
        </P>
        <P>
          Email providers also offer their own processing. Google says Gmail package tracking identifies tracking
          numbers through automatic processing and shares only the number with carrier partners. It is a useful
          example of a different trust model: the inbox provider already holds the mail, so no new third-party
          inbox connection is needed.{' '}
          <a href="https://support.google.com/mail/answer/13073650?hl=en" className="text-blue-700 underline">
            Google documents the flow here
          </a>
          .
        </P>

        <H2>A practical privacy checklist</H2>
        <ul className="list-disc pl-6 text-gray-700 space-y-2 my-4 leading-7">
          <li>
            <strong>Scope:</strong> does the app receive a tracking number, selected messages or access to search
            the mailbox?
          </li>
          <li>
            <strong>Content:</strong> what personal or order information is inside the message you are sharing?
          </li>
          <li>
            <strong>Retention:</strong> is the original email kept, reduced to shipment fields or deleted after
            processing?
          </li>
          <li>
            <strong>Subprocessors:</strong> which carriers, model providers, mail hosts or notification services
            receive any part of the data?
          </li>
          <li>
            <strong>Controls:</strong> can you revoke access, delete a shipment and close the account without a
            support maze?
          </li>
          <li>
            <strong>Audience:</strong> if it is a shared tracker, who else in the group can read the forwarded
            message?
          </li>
        </ul>

        <H2>How CargoPax draws the boundary</H2>
        <P>
          CargoPax never connects to your personal or work inbox. Your organization gets a separate mailbox and
          the software sees what you forward there. It stores the forwarded message text so members can see which
          email produced a parcel, sends that text to OpenAI to label the shipment, and later sends carrier-page
          text to OpenAI to interpret status. The carrier receives a request for the tracking link, as it would
          if you opened it yourself.
        </P>
        <P>
          Those are real data flows, not a claim that forwarding makes data disappear. The benefit is control:
          you choose each message that crosses the boundary, and CargoPax never holds credentials or an OAuth
          grant for the inbox where the rest of your life or business lives. The full current disclosure is on{' '}
          <Link href="/privacy" className="text-blue-700 underline">
            the CargoPax privacy page
          </Link>
          .
        </P>

        <H2>Which method should you choose?</H2>
        <P>
          Connect an inbox when zero-touch capture is worth the broader permission and you trust the provider&rsquo;s
          controls. Paste numbers when volume is low and you want the smallest possible disclosure. Forward
          selected messages when you want automatic extraction without granting ongoing access to the source
          mailbox. There is no universally correct answer — only a boundary that should match the job.
        </P>
      </>
    )
  },
  {
    slug: 'what-carrier-tracking-pages-actually-say',
    title: 'What a carrier tracking page actually says, and why software keeps getting it wrong',
    seoTitle: 'Why carrier tracking software gets updates wrong',
    description:
      'Six lessons from reading UPS, FedEx, USPS, DHL, Canada Post and Purolator pages: overlapping numbers, missing dates and rendered status updates.',
    published: '2026-08-24',
    modified: '2026-08-24',
    readingMinutes: 7,
    category: 'Behind the tracking',
    audience: 'Anyone evaluating tracker accuracy',
    topics: ['carrier tracking pages', 'tracking number formats', 'parcel tracking accuracy'],
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
