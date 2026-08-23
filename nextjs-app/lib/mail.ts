import nodemailer from 'nodemailer';
import { getLogger } from '@/lib/logger';
import { SITE_NAME } from '@/lib/site';

/* Outbound email, the same way 8examples sends: Gmail SMTP through an app
   password. Env: GMAIL_USER, GMAIL_APP_PASSWORD (injected at deploy from the
   devops secrets GMAIL_8EXAMPLES_USER / GMAIL_8EXAMPLES_APP_PASSWORD).
   Owner notifications go to NOTIFY_EMAIL (default sbennett@8examples.com).

   EMAIL_TEST_MODE=1 logs instead of sending, so the full signup / reset /
   delivery flows run locally without credentials. */

const log = getLogger('mail');

export function getNotifyEmail(): string {
  return process.env.NOTIFY_EMAIL || 'sbennett@8examples.com';
}

export function isEmailTestMode(): boolean {
  return process.env.EMAIL_TEST_MODE === '1';
}

function transport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    return null;
  }
  return {
    t: nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass }
    }),
    user
  };
}

export function mailConfigured(): boolean {
  return isEmailTestMode() || transport() !== null;
}

export interface OutboundEmail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/* Returns false when mail credentials are not configured; throws on send
   failure so the job marks nothing and retries on the next pump. */
export async function sendEmail(email: OutboundEmail): Promise<boolean> {
  if (isEmailTestMode()) {
    log.info(`[test mode] would send "${email.subject}" to ${email.to}\n${email.text}`);
    return true;
  }
  const tr = transport();
  if (!tr) {
    log.warn(`GMAIL_USER/GMAIL_APP_PASSWORD not set; skipping email: ${email.subject}`);
    return false;
  }
  await tr.t.sendMail({ from: `${SITE_NAME} <${tr.user}>`, ...email });
  return true;
}

export async function notifyOwner(subject: string, text: string): Promise<boolean> {
  return sendEmail({ to: getNotifyEmail(), subject: `[${SITE_NAME}] ${subject}`, text });
}
