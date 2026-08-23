import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiKey } from '@/lib/auth/middleware';
import { serverError, unauthorized } from '@/lib/api/respond';
import { handleMarkEmailMessageAsProcessed } from '@/lib/commands/account-commands';
import { getLogger } from '@/lib/logger';

const log = getLogger('api/commands/mark-email-message-as-processed');

const Schema = z.object({
  tenantId: z.string().uuid(),
  messageId: z.string().min(1).max(500),
  trackerIds: z.array(z.string().uuid()).default([]),
  note: z.string().max(500).default('')
});

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
    try {
      handleMarkEmailMessageAsProcessed(tenantId, command);
    } catch (error: any) {
      const message = String(error?.message || error);
      if (message.includes('Unknown') || message.includes('not found')) {
        return NextResponse.json({ error: message }, { status: 404 });
      }
      if (message.includes('already processed')) {
        return NextResponse.json({ error: message }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    log.error('Mark email processed error:', error);
    return serverError(error);
  }
}
