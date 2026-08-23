import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireVerifiedUser } from '@/lib/auth/middleware';
import { serverError, unauthorized } from '@/lib/api/respond';
import { handleAssignTrackerToGroup } from '@/lib/commands/account-commands';
import { getLogger } from '@/lib/logger';

const log = getLogger('api/commands/assign-tracker-to-group');

const Schema = z.object({
  trackerId: z.string().uuid(),
  groupId: z.string().uuid().nullable()
});

export async function POST(request: NextRequest) {
  try {
    const auth = requireVerifiedUser(request);
    if (!auth.authenticated || !auth.tenantId) {
      return unauthorized(auth);
    }

    const validation = Schema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.issues }, { status: 400 });
    }

    try {
      handleAssignTrackerToGroup(auth.tenantId, validation.data);
    } catch (error: any) {
      if (String(error?.message).includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    log.error('Assign group error:', error);
    return serverError(error);
  }
}
