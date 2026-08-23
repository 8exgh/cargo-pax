import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserByEmail } from '@/lib/db/system';
import { signToken } from '@/lib/auth/jwt';
import { handleVerifyAccount } from '@/lib/commands/account-commands';
import { getAccountState } from '@/lib/queries/account-queries';
import { isOverAttemptLimit } from '@/lib/utils/rate-limit';
import { getLogger } from '@/lib/logger';

const log = getLogger('api/auth/verify-account');

const Schema = z.object({
  email: z.string().email(),
  code: z.string().trim().regex(/^\d{6}$/)
});

// The original /verify-account: email + 6-digit code. Returns a token so
// the user lands on the dashboard straight away.
export async function POST(request: NextRequest) {
  try {
    const validation = Schema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json({ error: 'Enter the 6-digit code from the email' }, { status: 400 });
    }
    const email = validation.data.email.trim().toLowerCase();

    // A handful of attempts per code keeps it un-guessable (10^6 codes)
    if (isOverAttemptLimit(`verify:${email}`, 10 * 60 * 1000, 5)) {
      return NextResponse.json({ error: 'Too many attempts; request a new code' }, { status: 429 });
    }

    const user = getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: 'That code is not right' }, { status: 400 });
    }

    try {
      handleVerifyAccount(user.tenant_id, { code: validation.data.code });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const state = getAccountState(user.tenant_id);
    const token = signToken({ userId: user.id, tenantId: user.tenant_id, role: user.role });
    log.info(`Verified ${email}`);
    return NextResponse.json({ success: true, verified: state.verified, userId: user.id, token });
  } catch (error: any) {
    log.error('Verify account error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
