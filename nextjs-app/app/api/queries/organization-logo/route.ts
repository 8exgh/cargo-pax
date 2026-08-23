import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/auth/middleware';
import { serverError, unauthorized } from '@/lib/api/respond';
import { getOrganizationLogo } from '@/lib/queries/account-queries';
import { getLogger } from '@/lib/logger';

const log = getLogger('api/queries/organization-logo');

// Serves the organization's own logo to its own people. Private by default:
// an organization's branding is not something to hand out to the internet.
export async function GET(request: NextRequest) {
  try {
    const auth = requireVerifiedUser(request);
    if (!auth.authenticated || !auth.tenantId) {
      return unauthorized(auth);
    }

    const logo = getOrganizationLogo(auth.tenantId);
    if (!logo) {
      return NextResponse.json({ error: 'No logo' }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(logo.blob), {
      headers: {
        'Content-Type': logo.mimeType,
        'Content-Length': String(logo.blob.length),
        // Immutable per version; the version changes when a new logo is set
        'Cache-Control': 'private, max-age=3600',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (error: any) {
    log.error('Get logo error:', error);
    return serverError(error);
  }
}
