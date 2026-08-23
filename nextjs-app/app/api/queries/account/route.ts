import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { serverError, unauthorized } from '@/lib/api/respond';
import { getAccountView } from '@/lib/queries/account-queries';
import { getLogger } from '@/lib/logger';

const log = getLogger('api/queries/account');

// The dashboard's single read. Unverified accounts get only their
// verification state back, so the UI can route to the verify page.
export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (!auth.authenticated || !auth.tenantId) {
      return unauthorized(auth);
    }

    const account = getAccountView(auth.tenantId);
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    if (!account.verified) {
      return NextResponse.json({ error: 'Verify your email first', needsVerification: true, email: account.email }, { status: 403 });
    }

    return NextResponse.json(account);
  } catch (error: any) {
    log.error('Get account error:', error);
    return serverError(error);
  }
}
