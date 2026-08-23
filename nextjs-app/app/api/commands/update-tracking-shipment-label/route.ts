import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireVerifiedUser } from '@/lib/auth/middleware';
import { serverError, unauthorized } from '@/lib/api/respond';
import { handleUpdateTrackingShipmentLabel } from '@/lib/commands/account-commands';
import { getLogger } from '@/lib/logger';

const log = getLogger('api/commands/update-tracking-shipment-label');

const Schema = z.object({
  trackerId: z.string().uuid(),
  label: z.string().trim().min(1).max(200)
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
      handleUpdateTrackingShipmentLabel(auth.tenantId, validation.data);
    } catch (error: any) {
      if (String(error?.message).includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    log.error('Update label error:', error);
    return serverError(error);
  }
}
