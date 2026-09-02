import type { Metadata, Viewport } from 'next'
import '../globals.css'
import { BuildInfoFooter } from '@/components/BuildInfoFooter'
import { FeedbackFooter } from '@/components/FeedbackFooter'
import { SITE_NAME, SITE_DESCRIPTION } from '@/lib/site'

export const metadata: Metadata = {
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  robots: { index: false, follow: false },
  manifest: '/manifest.webmanifest',
  // iOS reads these when the site is added to the Home Screen
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: 'default' },
  icons: { apple: '/apple-touch-icon.png' },
}

export const viewport: Viewport = {
  themeColor: '#1e40af',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <FeedbackFooter />
        <BuildInfoFooter />
      </body>
    </html>
  )
}
