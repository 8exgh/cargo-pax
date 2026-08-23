import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUsersByTenant, updateUserPassword } from '@/lib/db/system';
import { hashPassword, validatePassword } from '@/lib/auth/password';
import { handleCompletePasswordReset } from '@/lib/commands/account-commands';
import { findPasswordResetByToken } from '@/lib/queries/account-queries';
import { getLogger } from '@/lib/logger';

const log = getLogger('api/auth/reset-password');

const ResetPasswordSchema = z.object({
  token: z.string().min(16).max(256),
  newPassword: z.string().min(8)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = ResetPasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { token, newPassword } = validation.data;

    const reset = findPasswordResetByToken(token);
    if (!reset || reset.completed || reset.expiresAt < Date.now()) {
      return NextResponse.json(
        { error: 'This reset link is invalid or has expired. Request a new one.' },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.message },
        { status: 400 }
      );
    }

    const user = getUsersByTenant(reset.tenantId).find(u => u.role === 'admin') ?? getUsersByTenant(reset.tenantId)[0];
    if (!user) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Mark the link used first: if that fails (already used, expired) the
    // password stays as it was.
    handleCompletePasswordReset(reset.tenantId, { requestId: reset.requestId });
    updateUserPassword(user.id, await hashPassword(newPassword), 0);

    log.info(`Password reset completed for ${user.email}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    log.error('Reset password error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
