import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiKey } from '@/lib/auth/middleware';
import { serverError, unauthorized } from '@/lib/api/respond';
import { handleRecordEmailMessageReceived, MAX_EMAIL_BODY_CHARS } from '@/lib/commands/account-commands';
import { getLogger } from '@/lib/logger';

const log = getLogger('api/commands/record-email-message-received');

const Schema = z.object({
  tenantId: z.string().uuid(),
  messageId: z.string().min(1).max(500),
  uid: z.number().int().nonnegative(),
  uidValidity: z.number().int().nonnegative(),
  subject: z.string().default(''),
  from: z.string().default(''),
  to: z.string().default(''),
  receivedAt: z.number().int(),
  text: z.string().max(MAX_EMAIL_BODY_CHARS * 2).default(''),
  html: z.string().max(MAX_EMAIL_BODY_CHARS * 2).default('')
});

// Posted by the background processor for every new message it finds in an
// account's @cargopax.ca inbox. The body is kept on the event as a blob.
export async function POST(request: NextRequest) {
  try {
    const auth = requireApiKey(request);
    if (!auth.authenticated) {
      return unauthorized(auth);
    }

    const validation = Schema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.issues }, { status: 400 });
    }

    const { tenantId, ...command } = validation.data;
    let recorded: boolean;
    try {
      recorded = handleRecordEmailMessageReceived(tenantId, command);
    } catch (error: any) {
      if (String(error?.message).includes('Unknown tenant')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, recorded }, { status: 201 });
  } catch (error: any) {
    log.error('Record email message error:', error);
    return serverError(error);
  }
}
