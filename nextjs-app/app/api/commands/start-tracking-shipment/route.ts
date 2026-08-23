import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, requireVerifiedUser } from '@/lib/auth/middleware';
import { serverError, unauthorized } from '@/lib/api/respond';
import { handleStartTrackingShipment } from '@/lib/commands/account-commands';
import { isAllowedTrackingUrl } from '@/lib/queries/account-queries';
import { resolveTrackingInput } from '@/lib/tracking/tracking-input';
import { getLogger } from '@/lib/logger';

const log = getLogger('api/commands/start-tracking-shipment');

const COMPANIES = ['ups', 'fedex', 'usps', 'dhl', 'canada_post', 'purolator', 'priority1', 'unknown'] as const;

// Two callers, two shapes. A person sends `input`: a carrier link or a bare
// tracking number, with `company` when they picked one from the dropdown.
// The email processor (API key) sends what it already read out of the email.
const Schema = z.object({
  input: z.string().trim().min(1).max(2048).optional(),
  company: z.enum(COMPANIES).nullish(),
  url: z.string().trim().min(4).max(2048).optional(),
  tenantId: z.string().uuid().optional(),
  shipmentCompany: z.enum(COMPANIES).optional(),
  trackingNumber: z.string().trim().max(100).optional(),
  label: z.string().trim().max(200).optional(),
  messageId: z.string().max(500).optional()
}).refine(v => v.input || v.url, { message: 'input or url is required' });

export async function POST(request: NextRequest) {
  try {
    const validation = Schema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.issues }, { status: 400 });
    }
    const body = validation.data;

    let tenantId: string;
    let source: 'manual' | 'email';
    const probe = authenticateRequest(request);
    if (probe.authenticated && probe.isApiKey) {
      if (!body.tenantId) {
        return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
      }
      tenantId = body.tenantId;
      source = 'email';
    } else {
      const auth = requireVerifiedUser(request);
      if (!auth.authenticated || !auth.tenantId) {
        return unauthorized(auth);
      }
      tenantId = auth.tenantId;
      source = 'manual';
    }

    // Work out what was actually pasted, unless the caller already knows
    let url = body.url ?? '';
    let shipmentCompany = body.shipmentCompany;
    let trackingNumber = body.trackingNumber;

    if (body.input) {
      const resolved = resolveTrackingInput(body.input, body.company ?? null);
      if (!resolved.ok) {
        return NextResponse.json(
          {
            error: resolved.message,
            reason: resolved.reason,
            ...(resolved.reason === 'ambiguous' ? { candidates: resolved.candidates } : {})
          },
          { status: 400 }
        );
      }
      url = resolved.url;
      shipmentCompany = resolved.company;
      trackingNumber = resolved.trackingNumber;
    }

    let trackerId: string;
    try {
      trackerId = handleStartTrackingShipment(tenantId, {
        url,
        shipmentCompany,
        trackingNumber,
        label: body.label,
        source,
        messageId: body.messageId ?? null
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

    return NextResponse.json(
      { success: true, trackerId, url, company: shipmentCompany, trackingNumber, willRefresh: isAllowedTrackingUrl(url) },
      { status: 201 }
    );
  } catch (error: any) {
    log.error('Start tracking error:', error);
    return serverError(error);
  }
}
