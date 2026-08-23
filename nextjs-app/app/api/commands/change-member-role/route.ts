import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireVerifiedAdmin } from '@/lib/auth/middleware';
import { serverError, unauthorized } from '@/lib/api/respond';
import { countAdmins, getUserById, updateUserRole } from '@/lib/db/system';
import { handleChangeMemberRole } from '@/lib/commands/account-commands';
import { getLogger } from '@/lib/logger';

const log = getLogger('api/commands/change-member-role');

const Schema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['admin', 'member'])
});

// Any admin can promote anyone, and demote anyone - except the last admin,
// which would leave the organization with nobody who can manage it.
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
    const { userId, role } = validation.data;

    const user = getUserById(userId);
    if (!user || user.tenant_id !== auth.tenantId) {
      return NextResponse.json({ error: 'That person is not in your organization' }, { status: 404 });
    }
    if (user.role === role) {
      return NextResponse.json({ success: true }, { status: 201 });
    }
    if (role === 'member' && user.role === 'admin' && countAdmins(auth.tenantId) <= 1) {
      return NextResponse.json(
        { error: 'Promote someone else first - an organization needs at least one admin.' },
        { status: 409 }
      );
    }

    updateUserRole(userId, role);
    handleChangeMemberRole(auth.tenantId, { userId, email: user.email, role, changedBy: auth.userId });

    log.info(`${user.email} is now ${role} in tenant ${auth.tenantId}`);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    log.error('Change member role error:', error);
    return serverError(error);
  }
}
