export const SITE_NAME = 'CargoPax';
export const SITE_DESCRIPTION = 'Shipment tracking with a @cargopax.ca inbox for every account';

// The domain every account's inbox lives on. Migadu must host it (the
// domain is added to the Migadu account by hand once; mailboxes are created
// per account by the provisioning job).
export function getMailDomain(): string {
  return process.env.MAIL_DOMAIN || 'cargopax.ca';
}

// Public origin used in emails (password reset links). Production sets it
// to the tunnelled domain; local dev falls back to the Next.js port.
export function getAppBaseUrl(): string {
  return (process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

// Where the issued mailboxes live (Migadu)
export const MAIL_HOSTS = {
  imap: 'imap.migadu.com:993 (SSL)',
  smtp: 'smtp.migadu.com:465 (SSL)',
  webmail: 'https://webmail.migadu.com'
};
