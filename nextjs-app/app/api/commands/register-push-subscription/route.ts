import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireVerifiedUser } from '@/lib/auth/middleware';
import { serverError, unauthorized } from '@/lib/api/respond';
import { handleRegisterWebPushSubscription } from '@/lib/commands/account-commands';
import { getLogger } from '@/lib/logger';

const log = getLogger('api/commands/register-push-subscription');

const Schema = z.object({
  endpoint: z.string().url().max(1024),
  p256dh: z.string().min(1).max(256),
  auth: z.string().min(1).max(256)
});

// The browser hands us its push subscription after the user grants
// permission. One per device; re-registering the same endpoint is a no-op.
export async function POST(request: NextRequest) {
  try {
    const auth = requireVerifiedUser(request);
    if (!auth.authenticated || !auth.tenantId) {
      return unauthorized(auth);
    }

    const validation = Schema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid subscription', details: validation.error.issues }, { status: 400 });
    }

    handleRegisterWebPushSubscription(auth.tenantId, {
      ...validation.data,
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    log.info(`Registered a push subscription for tenant ${auth.tenantId}`);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    log.error('Register push subscription error:', error);
    return serverError(error);
  }
}
