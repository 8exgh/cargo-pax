import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireVerifiedAdmin } from '@/lib/auth/middleware';
import { serverError, unauthorized } from '@/lib/api/respond';
import { handleNameOrganization } from '@/lib/commands/account-commands';
import { getLogger } from '@/lib/logger';

const log = getLogger('api/commands/name-organization');

const Schema = z.object({ name: z.string().trim().min(1).max(120) });

export async function POST(request: NextRequest) {
  try {
    const auth = requireVerifiedAdmin(request);
    if (!auth.authenticated || !auth.tenantId) {
      return unauthorized(auth);
    }
    const validation = Schema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json({ error: 'An organization name is required' }, { status: 400 });
    }

    handleNameOrganization(auth.tenantId, validation.data);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    log.error('Name organization error:', error);
    return serverError(error);
  }
}
