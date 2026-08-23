import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedAdmin } from '@/lib/auth/middleware';
import { serverError, unauthorized } from '@/lib/api/respond';
import { handleSetOrganizationLogo, MAX_LOGO_BYTES } from '@/lib/commands/account-commands';
import { getLogger } from '@/lib/logger';

const log = getLogger('api/commands/set-organization-logo');

// multipart, because it carries a file. The image is stored on the event,
// so there is no upload directory or object store to manage.
export async function POST(request: NextRequest) {
  try {
    const auth = requireVerifiedAdmin(request);
    if (!auth.authenticated || !auth.tenantId) {
      return unauthorized(auth);
    }

    const form = await request.formData().catch(() => null);
    const file = form?.get('logo');
    if (!form || !(file instanceof File)) {
      return NextResponse.json({ error: 'Attach an image as "logo"' }, { status: 400 });
    }
    if (file.size > MAX_LOGO_BYTES) {
      return NextResponse.json(
        { error: `That image is too big (limit ${Math.round(MAX_LOGO_BYTES / 1024)} KB)` },
        { status: 413 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    try {
      handleSetOrganizationLogo(auth.tenantId, {
        mimeType: file.type,
        filename: file.name || 'logo',
        bytes
      });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    log.info(`Logo set for tenant ${auth.tenantId} (${bytes.length} bytes, ${file.type})`);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    log.error('Set logo error:', error);
    return serverError(error);
  }
}
