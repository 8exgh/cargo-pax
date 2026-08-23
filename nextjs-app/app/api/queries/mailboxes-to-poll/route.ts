import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/auth/middleware';
import { serverError, unauthorized } from '@/lib/api/respond';
import { getMailboxesToPoll } from '@/lib/queries/account-queries';
import { getLogger } from '@/lib/logger';

const log = getLogger('api/queries/mailboxes-to-poll');

// Every provisioned @cargopax.ca inbox with its IMAP credentials and the
// last uid already recorded, for the processor's inbox poll.
export async function GET(request: NextRequest) {
  try {
    const auth = requireApiKey(request);
    if (!auth.authenticated) {
      return unauthorized(auth);
    }
    return NextResponse.json({ mailboxes: getMailboxesToPoll() });
  } catch (error: any) {
    log.error('Get mailboxes to poll error:', error);
    return serverError(error);
  }
}
