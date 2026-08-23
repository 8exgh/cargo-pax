import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiKey } from '@/lib/auth/middleware';
import { serverError, unauthorized } from '@/lib/api/respond';
import { handleUpdateTrackingShipmentStatus } from '@/lib/commands/account-commands';
import { pumpJobs } from '@/lib/jobs';
import { getLogger } from '@/lib/logger';

const log = getLogger('api/commands/update-tracking-shipment-status');

const Schema = z.object({
  tenantId: z.string().uuid(),
  trackerId: z.string().uuid(),
  estimatedDeliveryDate: z.string().default(''),
  labelCreatedOnDate: z.string().default(''),
  onTheWayDate: z.string().default(''),
  outForDeliveryDate: z.string().default(''),
  deliveredOnDate: z.string().default(''),
  errorMessage: z.string().default('')
});

// Posted by the background processor with what it read off the carrier page
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
      handleUpdateTrackingShipmentStatus(tenantId, command);
    } catch (error: any) {
      const message = String(error?.message || error);
      if (message.includes('not found') || message.includes('Unknown tenant')) {
        return NextResponse.json({ error: message }, { status: 404 });
      }
      if (message.includes('Could not parse')) {
        return NextResponse.json({ error: message }, { status: 400 });
      }
      throw error;
    }

    // The refresh just completed: any pending status changes can be emailed
    void pumpJobs().catch(error => log.error('Job pump failed after status update:', error));

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    log.error('Update tracking status error:', error);
    return serverError(error);
  }
}
