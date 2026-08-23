import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/auth/middleware';
import { serverError, unauthorized } from '@/lib/api/respond';
import { handleRefreshTrackers } from '@/lib/commands/account-commands';
import { getLogger } from '@/lib/logger';

const log = getLogger('api/commands/refresh-trackers');

// "Refresh all": a fresh scrape of every undelivered tracker
export async function POST(request: NextRequest) {
  try {
    const auth = requireVerifiedUser(request);
    if (!auth.authenticated || !auth.tenantId) {
      return unauthorized(auth);
    }

    const requested = handleRefreshTrackers(auth.tenantId);
    return NextResponse.json({ success: true, requested }, { status: 201 });
  } catch (error: any) {
    log.error('Refresh trackers error:', error);
    return serverError(error);
  }
}
