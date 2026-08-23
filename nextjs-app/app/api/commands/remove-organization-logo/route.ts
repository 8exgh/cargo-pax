import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedAdmin } from '@/lib/auth/middleware';
import { serverError, unauthorized } from '@/lib/api/respond';
import { handleRemoveOrganizationLogo } from '@/lib/commands/account-commands';
import { getLogger } from '@/lib/logger';

const log = getLogger('api/commands/remove-organization-logo');

export async function POST(request: NextRequest) {
  try {
    const auth = requireVerifiedAdmin(request);
    if (!auth.authenticated || !auth.tenantId) {
      return unauthorized(auth);
    }
    handleRemoveOrganizationLogo(auth.tenantId);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    log.error('Remove logo error:', error);
    return serverError(error);
  }
}
