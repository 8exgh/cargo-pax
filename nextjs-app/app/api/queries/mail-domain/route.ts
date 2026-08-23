import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/auth/middleware';
import { serverError, unauthorized } from '@/lib/api/respond';
import { ensureMailDomain, getMailDomainStatus } from '@/lib/mail-domain';
import { getLogger } from '@/lib/logger';

const log = getLogger('api/queries/mail-domain');

// Operational: is MAIL_DOMAIN live on Migadu, and if not, exactly which DNS
// records are still missing. `?recheck=1` forces a fresh convergence run
// instead of answering from the cached result.
export async function GET(request: NextRequest) {
  try {
    const auth = requireApiKey(request);
    if (!auth.authenticated) {
      return unauthorized(auth);
    }

    const recheck = request.nextUrl.searchParams.get('recheck') === '1';
    const status = recheck ? await ensureMailDomain(true) : getMailDomainStatus();
    return NextResponse.json(status);
  } catch (error: any) {
    log.error('Mail domain status error:', error);
    return serverError(error);
  }
}
