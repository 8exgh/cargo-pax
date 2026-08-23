import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/auth/middleware';
import { serverError, unauthorized } from '@/lib/api/respond';
import { getAccountState } from '@/lib/queries/account-queries';
import { handleRemoveWebPushSubscription } from '@/lib/commands/account-commands';
import { pushConfigured, sendPush } from '@/lib/push';
import { SITE_NAME } from '@/lib/site';
import { getLogger } from '@/lib/logger';

const log = getLogger('api/commands/send-test-push');

// Lets someone confirm notifications actually reach their device, which on
// iOS is the only way to be sure the Home Screen install took.
export async function POST(request: NextRequest) {
  try {
    const auth = requireVerifiedUser(request);
    if (!auth.authenticated || !auth.tenantId) {
      return unauthorized(auth);
    }
    if (!pushConfigured()) {
      return NextResponse.json({ error: 'Push notifications are not configured on this server' }, { status: 503 });
    }

    const subscriptions = getAccountState(auth.tenantId).pushSubscriptions;
    if (subscriptions.length === 0) {
      return NextResponse.json({ error: 'No device is subscribed yet' }, { status: 409 });
    }

    let sent = 0;
    let expired = 0;
    for (const subscription of subscriptions) {
      const outcome = await sendPush(subscription, {
        title: `${SITE_NAME} notifications are on`,
        body: 'This is what a shipment update will look like.',
        tag: 'cargopax-test'
      });
      if (outcome === 'sent') {
        sent++;
      } else if (outcome === 'expired') {
        expired++;
        handleRemoveWebPushSubscription(auth.tenantId, { endpoint: subscription.endpoint, reason: 'expired' });
      }
    }

    log.info(`Test push for tenant ${auth.tenantId}: ${sent} sent, ${expired} expired`);
    return NextResponse.json({ success: sent > 0, sent, expired, devices: subscriptions.length });
  } catch (error: any) {
    log.error('Test push error:', error);
    return serverError(error);
  }
}
