import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/auth/middleware';
import { serverError, unauthorized } from '@/lib/api/respond';
import { getRefreshRequests } from '@/lib/queries/account-queries';
import { pumpJobs } from '@/lib/jobs';
import { getLogger } from '@/lib/logger';

const log = getLogger('api/queries/refresh-requests');

// What the background processor polls: every tracker waiting on a refresh,
// across all accounts, best first. Each poll also pumps the in-process
// jobs (mailboxes, emails), so they run without any page traffic.
export async function GET(request: NextRequest) {
  try {
    const auth = requireApiKey(request);
    if (!auth.authenticated) {
      return unauthorized(auth);
    }

    void pumpJobs().catch(error => log.error('Job pump failed:', error));

    return NextResponse.json({ requests: getRefreshRequests() });
  } catch (error: any) {
    log.error('Get refresh requests error:', error);
    return serverError(error);
  }
}
