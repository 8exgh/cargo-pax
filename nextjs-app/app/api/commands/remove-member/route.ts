import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireVerifiedAdmin } from '@/lib/auth/middleware';
import { serverError, unauthorized } from '@/lib/api/respond';
import { countAdmins, deleteUser, getUserById } from '@/lib/db/system';
import { handleRemoveMember } from '@/lib/commands/account-commands';
import { getLogger } from '@/lib/logger';

const log = getLogger('api/commands/remove-member');

const Schema = z.object({ userId: z.string().uuid() });

export async function POST(request: NextRequest) {
  try {
    const auth = requireVerifiedAdmin(request);
    if (!auth.authenticated || !auth.tenantId || !auth.userId) {
      return unauthorized(auth);
    }

    const validation = Schema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    const { userId } = validation.data;

    const user = getUserById(userId);
    if (!user || user.tenant_id !== auth.tenantId) {
      return NextResponse.json({ error: 'That person is not in your organization' }, { status: 404 });
    }
    if (userId === auth.userId) {
      return NextResponse.json({ error: 'You cannot remove yourself.' }, { status: 409 });
    }
    if (user.role === 'admin' && countAdmins(auth.tenantId) <= 1) {
      return NextResponse.json({ error: 'That is the only admin left.' }, { status: 409 });
    }

    deleteUser(userId);
    handleRemoveMember(auth.tenantId, { userId, email: user.email, removedBy: auth.userId });

    log.info(`Removed ${user.email} from tenant ${auth.tenantId}`);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    log.error('Remove member error:', error);
    return serverError(error);
  }
}
