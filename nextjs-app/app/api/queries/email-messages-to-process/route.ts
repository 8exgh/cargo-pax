import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/auth/middleware';
import { serverError, unauthorized } from '@/lib/api/respond';
import { getEmailMessagesToProcess } from '@/lib/queries/account-queries';
import { getLogger } from '@/lib/logger';

const log = getLogger('api/queries/email-messages-to-process');

// Forwarded emails that have not had their tracking links pulled out yet
export async function GET(request: NextRequest) {
  try {
    const auth = requireApiKey(request);
    if (!auth.authenticated) {
      return unauthorized(auth);
    }
    return NextResponse.json({ messages: getEmailMessagesToProcess() });
  } catch (error: any) {
    log.error('Get email messages to process error:', error);
    return serverError(error);
  }
}
