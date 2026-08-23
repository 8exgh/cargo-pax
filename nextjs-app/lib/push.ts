import webpush from 'web-push';
import { getLogger } from '@/lib/logger';
import { getAppBaseUrl, SITE_NAME } from '@/lib/site';

/* Web push (VAPID). This is the notification channel the original product
   had as APNs + FCM device pushes; browsers and installed PWAs speak one
   protocol, so there are no Apple certificates or Firebase projects here -
   just a keypair (CARGO_PAX_VAPID_* in devops).

   On iOS a push only reaches a site the user added to the Home Screen; the
   UI explains that rather than offering a button that cannot work. */

const log = getLogger('push');

export function pushPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

export function pushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function subject(): string {
  // VAPID wants a contact for the push service to complain to
  return process.env.VAPID_SUBJECT || `mailto:${process.env.NOTIFY_EMAIL || 'sbennett@8examples.com'}`;
}

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export type PushOutcome = 'sent' | 'expired' | 'failed';

/* Sends one notification. "expired" means the push service says this
   subscription is dead (404/410) and the caller should forget it - the web
   equivalent of an unregistered device token. */
export async function sendPush(
  target: PushTarget,
  payload: { title: string; body: string; url?: string; tag?: string }
): Promise<PushOutcome> {
  if (!pushConfigured()) {
    return 'failed';
  }
  webpush.setVapidDetails(subject(), process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);

  try {
    await webpush.sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify({ ...payload, url: payload.url || `${getAppBaseUrl()}/dashboard` }),
      { TTL: 24 * 60 * 60 }
    );
    return 'sent';
  } catch (error: any) {
    const status = error?.statusCode;
    if (status === 404 || status === 410) {
      return 'expired';
    }
    log.warn(`push to ${target.endpoint.slice(0, 60)}… failed (${status ?? 'no status'}): ${error?.body || error?.message || error}`);
    return 'failed';
  }
}

export function notificationTitle(delivered: boolean, label: string): string {
  return delivered ? `Delivered: ${label}` : `${SITE_NAME}: ${label}`;
}
