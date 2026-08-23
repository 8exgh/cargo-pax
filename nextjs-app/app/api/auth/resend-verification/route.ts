import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserByEmail } from '@/lib/db/system';
import { generateVerificationCode, VERIFICATION_CODE_TTL_MS } from '@/lib/auth/verification';
import { handleIssueVerificationCode } from '@/lib/commands/account-commands';
import { getAccountState } from '@/lib/queries/account-queries';
import { pumpJobs } from '@/lib/jobs';
import { isRateLimited } from '@/lib/utils/rate-limit';
import { getLogger } from '@/lib/logger';

const log = getLogger('api/auth/resend-verification');

const Schema = z.object({ email: z.string().email() });

// The original /resend-verify-account. Always 200; never reveals whether
// the email exists.
export async function POST(request: NextRequest) {
  try {
    const validation = Schema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    const email = validation.data.email.trim().toLowerCase();

    if (isRateLimited(`resend:${email}`, 60 * 1000)) {
      return NextResponse.json({ error: 'Please wait a minute before requesting another code' }, { status: 429 });
    }

    const user = getUserByEmail(email);
    if (user && !getAccountState(user.tenant_id).verified) {
      handleIssueVerificationCode(user.tenant_id, {
        code: generateVerificationCode(),
        expiresAt: Date.now() + VERIFICATION_CODE_TTL_MS
      });
      void pumpJobs().catch(error => log.error('Job pump failed after resend:', error));
      log.info(`Verification code re-issued for ${email}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    log.error('Resend verification error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
