import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireVerifiedAdmin } from '@/lib/auth/middleware';
import { serverError, unauthorized } from '@/lib/api/respond';
import { updateTenantMailboxLocalPart } from '@/lib/db/system';
import { handleAssignCargoPaxEmailIdentifier } from '@/lib/commands/account-commands';
import { mailboxAvailability, normalizeLocalPart } from '@/lib/mailbox';
import { pumpJobs } from '@/lib/jobs';
import { getMailDomain } from '@/lib/site';
import { getLogger } from '@/lib/logger';

const log = getLogger('api/commands/assign-cargo-pax-email-identifier');

const Schema = z.object({ emailIdentifier: z.string().min(1).max(64) });

// "Take ownership of <name>@cargopax.ca" from the original settings screen:
// a new inbox is provisioned for the name and the old one retired.
export async function POST(request: NextRequest) {
  try {
    const auth = requireVerifiedAdmin(request);
    if (!auth.authenticated || !auth.tenantId) {
      return unauthorized(auth);
    }

    const validation = Schema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.issues }, { status: 400 });
    }

    const domain = getMailDomain();
    const emailIdentifier = normalizeLocalPart(validation.data.emailIdentifier);
    const availability = await mailboxAvailability(emailIdentifier, domain, auth.tenantId);
    if (!availability.available) {
      return NextResponse.json({ error: availability.reason || 'That address is taken.' }, { status: 409 });
    }

    try {
      updateTenantMailboxLocalPart(auth.tenantId, emailIdentifier);
    } catch (error: any) {
      if (String(error?.message || '').includes('UNIQUE')) {
        return NextResponse.json({ error: 'That address is taken.' }, { status: 409 });
      }
      throw error;
    }

    try {
      handleAssignCargoPaxEmailIdentifier(auth.tenantId, { emailIdentifier, mailboxDomain: domain });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    void pumpJobs().catch(error => log.error('Job pump failed after identifier change:', error));

    return NextResponse.json({ success: true, forwardingAddress: `${emailIdentifier}@${domain}` }, { status: 201 });
  } catch (error: any) {
    log.error('Assign email identifier error:', error);
    return serverError(error);
  }
}
