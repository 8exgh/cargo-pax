import type { Metadata } from 'next';
import Link from 'next/link';
import '../globals.css';
import { BrandMark, Wordmark } from '@/components/Brand';
import { getSiteUrl, SITE_NAME } from '@/lib/site';

/* The public side of the site. Server-rendered with no client JavaScript:
   the whole page is in the first response, which is what a crawler reads
   and what makes it fast for everyone else. */

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { default: `${SITE_NAME} — parcel tracking from your shipping emails`, template: `%s — ${SITE_NAME}` },
  description:
    'Forward shipping emails to your own @cargopax.ca address. CargoPax finds the tracking links, follows every parcel and tells you when things move.',
  manifest: '/manifest.webmanifest',
  icons: { apple: '/apple-touch-icon.png' },
  category: 'technology'
};

const NAV = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/shared-package-tracking', label: 'For teams' },
  { href: '/carriers', label: 'Carriers' },
  { href: '/blog', label: 'Blog' },
  { href: '/about', label: 'About' }
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:bg-white focus:px-3 focus:py-2 focus:rounded focus:shadow"
        >
          Skip to content
        </a>

        <header className="border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2">
              <BrandMark />
              <Wordmark />
            </Link>
            <nav aria-label="Main" className="flex items-center gap-4 text-sm">
              {NAV.map(item => (
                <Link key={item.href} href={item.href} className="text-gray-600 hover:text-gray-900 hidden md:inline">
                  {item.label}
                </Link>
              ))}
              <Link href="/login" className="text-blue-700 hover:underline">
                Sign in
              </Link>
              <Link href="/register" className="bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700">
                Get started
              </Link>
            </nav>
          </div>
        </header>

        <main id="main">{children}</main>

        <footer className="border-t border-gray-200 mt-16">
          <div className="max-w-5xl mx-auto px-4 py-8 text-sm text-gray-600 space-y-4">
            <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
              {NAV.map(item => (
                <Link key={item.href} href={item.href} className="hover:text-gray-900">
                  {item.label}
                </Link>
              ))}
              <Link href="/privacy" className="hover:text-gray-900">
                Privacy
              </Link>
              <Link href="/faq" className="hover:text-gray-900">
                FAQ
              </Link>
              <a href="/blog/feed.xml" className="hover:text-gray-900">
                RSS
              </a>
              <Link href="/login" className="hover:text-gray-900">
                Sign in
              </Link>
            </nav>
            <p>
              {SITE_NAME} is built and run by{' '}
              <a href="https://8examples.com" className="text-blue-700 hover:underline">
                8examples.com
              </a>{' '}
              in Calgary, Alberta. Hosted by{' '}
              <a href="https://swiftgrid.net" className="text-blue-700 hover:underline">
                SwiftGrid.net
              </a>
              .
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
