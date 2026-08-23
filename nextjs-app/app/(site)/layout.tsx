import type { Metadata } from 'next'
import '../globals.css'
import { BuildInfoFooter } from '@/components/BuildInfoFooter'
import { FeedbackFooter } from '@/components/FeedbackFooter'
import { SITE_NAME, SITE_DESCRIPTION } from '@/lib/site'

export const metadata: Metadata = {
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
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
