export const SITE_NAME = 'CargoPax';
export const SITE_DESCRIPTION = 'Shipment tracking with a @cargopax.ca inbox for every account';

// The domain every account's inbox lives on. Migadu must host it (the
// domain is added to the Migadu account by hand once; mailboxes are created
// per account by the provisioning job).
export function getMailDomain(): string {
  return process.env.MAIL_DOMAIN || 'cargopax.ca';
}

// Public origin used in emails (password reset links). Production sets it
// to the real domain; local dev falls back to the Next.js port.
export function getAppBaseUrl(): string {
  return (process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

/* The address the site is published at, for canonical URLs, the sitemap and
   robots.txt.

   This is deliberately separate from getAppBaseUrl: the public pages are
   prerendered at build time, so a runtime environment variable is not read
   when their canonical tags are written. It defaults to the live domain
   rather than localhost, because a build that quietly emitted
   "http://localhost:3000" as the canonical URL of every page would tell a
   search engine the real version of this site is one it cannot fetch.
   Override with NEXT_PUBLIC_SITE_URL at build time. */
export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://cargopax.ca').replace(/\/+$/, '');
}

// Where the issued mailboxes live (Migadu)
export const MAIL_HOSTS = {
  imap: 'imap.migadu.com:993 (SSL)',
  smtp: 'smtp.migadu.com:465 (SSL)',
  webmail: 'https://webmail.migadu.com'
};
