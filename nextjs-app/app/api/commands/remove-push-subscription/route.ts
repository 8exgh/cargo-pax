import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireVerifiedUser } from '@/lib/auth/middleware';
import { serverError, unauthorized } from '@/lib/api/respond';
import { handleRemoveWebPushSubscription } from '@/lib/commands/account-commands';
import { getLogger } from '@/lib/logger';

const log = getLogger('api/commands/remove-push-subscription');

const Schema = z.object({ endpoint: z.string().url().max(1024) });

export async function POST(request: NextRequest) {
  try {
    const auth = requireVerifiedUser(request);
    if (!auth.authenticated || !auth.tenantId) {
      return unauthorized(auth);
    }

    const validation = Schema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.issues }, { status: 400 });
    }

    handleRemoveWebPushSubscription(auth.tenantId, { endpoint: validation.data.endpoint, reason: 'user' });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    log.error('Remove push subscription error:', error);
    return serverError(error);
  }
}
