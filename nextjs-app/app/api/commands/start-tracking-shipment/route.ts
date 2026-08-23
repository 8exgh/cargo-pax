import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, requireVerifiedUser } from '@/lib/auth/middleware';
import { serverError, unauthorized } from '@/lib/api/respond';
import { handleStartTrackingShipment } from '@/lib/commands/account-commands';
import { isAllowedTrackingUrl } from '@/lib/queries/account-queries';
import { getLogger } from '@/lib/logger';

const log = getLogger('api/commands/start-tracking-shipment');

const COMPANIES = ['ups', 'fedex', 'usps', 'dhl', 'canada_post', 'purolator', 'priority1', 'unknown'] as const;

// A user pastes a url; the email processor (API key) adds what it read
// from the forwarded email: tenant, carrier, tracking number, label.
const Schema = z.object({
  url: z.string().trim().min(4).max(2048),
  tenantId: z.string().uuid().optional(),
  shipmentCompany: z.enum(COMPANIES).optional(),
  trackingNumber: z.string().trim().max(100).optional(),
  label: z.string().trim().max(200).optional(),
  messageId: z.string().max(500).optional()
});

export async function POST(request: NextRequest) {
  try {
    const validation = Schema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.issues }, { status: 400 });
    }
    const input = validation.data;

    let tenantId: string;
    let source: 'manual' | 'email';
    const probe = authenticateRequest(request);
    if (probe.authenticated && probe.isApiKey) {
      if (!input.tenantId) {
        return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
      }
      tenantId = input.tenantId;
      source = 'email';
    } else {
      const auth = requireVerifiedUser(request);
      if (!auth.authenticated || !auth.tenantId) {
        return unauthorized(auth);
      }
      tenantId = auth.tenantId;
      source = 'manual';
    }

    let trackerId: string;
    try {
      trackerId = handleStartTrackingShipment(tenantId, {
        url: input.url,
        shipmentCompany: input.shipmentCompany,
        trackingNumber: input.trackingNumber,
        label: input.label,
        source,
        messageId: input.messageId ?? null
      });
    } catch (error: any) {
      const message = String(error?.message || error);
      if (message.includes('already being tracked')) {
        return NextResponse.json({ error: message }, { status: 409 });
      }
      if (message.includes('Invalid URL') || message.includes('Only http')) {
        return NextResponse.json({ error: 'That does not look like a valid url' }, { status: 400 });
      }
      if (message.includes('Unknown tenant')) {
        return NextResponse.json({ error: message }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, trackerId, willRefresh: isAllowedTrackingUrl(input.url) }, { status: 201 });
  } catch (error: any) {
    log.error('Start tracking error:', error);
    return serverError(error);
  }
}
