import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/middleware';
import { mailboxAvailability, normalizeLocalPart } from '@/lib/mailbox';
import { getMailDomain } from '@/lib/site';
import { isRateLimited } from '@/lib/utils/rate-limit';
import { getLogger } from '@/lib/logger';

const log = getLogger('api/queries/mailbox-availability');

// Public (the register and settings forms call it while typing). Lightly
// rate limited per IP because it can reach the mail provider. A logged-in
// caller's own current name counts as available to them.
export async function GET(request: NextRequest) {
  try {
    const raw = request.nextUrl.searchParams.get('localPart') || '';
    const localPart = normalizeLocalPart(raw);
    const domain = getMailDomain();

    if (!localPart) {
      return NextResponse.json({ available: false, reason: 'Pick a name for your address.', address: null });
    }

    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
      || request.headers.get('x-real-ip')
      || 'anonymous';
    if (isRateLimited(`mailbox-check:${clientIp}`, 400)) {
      return NextResponse.json({ error: 'Slow down' }, { status: 429 });
    }

    const auth = authenticateRequest(request);
    const exceptTenantId = auth.authenticated && !auth.isApiKey ? auth.tenantId : undefined;

    const availability = await mailboxAvailability(localPart, domain, exceptTenantId);
    return NextResponse.json({
      available: availability.available,
      reason: availability.available ? undefined : availability.reason || 'That address is taken.',
      address: `${localPart}@${domain}`
    });
  } catch (error: any) {
    log.error('Mailbox availability error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
