import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { requireVerifiedAdmin } from '@/lib/auth/middleware';
import { serverError, unauthorized } from '@/lib/api/respond';
import { handleCreateGroup } from '@/lib/commands/account-commands';
import { getLogger } from '@/lib/logger';

const log = getLogger('api/commands/create-group');

const Schema = z.object({ name: z.string().trim().min(1).max(60) });

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

    const groupId = uuidv4();
    try {
      handleCreateGroup(auth.tenantId, { groupId, name: validation.data.name });
    } catch (error: any) {
      if (String(error?.message).includes('already exists')) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, groupId }, { status: 201 });
  } catch (error: any) {
    log.error('Create group error:', error);
    return serverError(error);
  }
}
