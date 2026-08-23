import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/auth/middleware';
import { serverError, unauthorized } from '@/lib/api/respond';
import { getEmailMessageContent } from '@/lib/queries/account-queries';
import { getLogger } from '@/lib/logger';

const log = getLogger('api/queries/email-message-content');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  try {
    const auth = requireApiKey(request);
    if (!auth.authenticated) {
      return unauthorized(auth);
    }

    const tenantId = request.nextUrl.searchParams.get('tenantId') || '';
    const messageId = request.nextUrl.searchParams.get('messageId') || '';
    if (!UUID.test(tenantId) || !messageId) {
      return NextResponse.json({ error: 'tenantId and messageId are required' }, { status: 400 });
    }

    let content;
    try {
      content = getEmailMessageContent(tenantId, messageId);
    } catch (error: any) {
      if (String(error?.message).includes('Unknown tenant')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      throw error;
    }
    if (!content) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }
    return NextResponse.json(content);
  } catch (error: any) {
    log.error('Get email message content error:', error);
    return serverError(error);
  }
}
