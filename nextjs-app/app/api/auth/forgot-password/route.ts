import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { getUserByEmail } from '@/lib/db/system';
import { handleRequestPasswordReset } from '@/lib/commands/account-commands';
import { pumpJobs } from '@/lib/jobs';
import { isRateLimited } from '@/lib/utils/rate-limit';
import { getLogger } from '@/lib/logger';

const log = getLogger('api/auth/forgot-password');

const ForgotPasswordSchema = z.object({
  email: z.string().email()
});

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

// Appends password_reset_requested for the account; the send-reset-email
// job mails the link. The response never reveals whether the email exists.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = ForgotPasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const email = validation.data.email.trim().toLowerCase();

    if (isRateLimited(`reset:${email}`, RATE_LIMIT_WINDOW_MS)) {
      return NextResponse.json(
        { error: 'Please wait a minute before requesting another reset email' },
        { status: 429 }
      );
    }

    const user = getUserByEmail(email);
    if (user) {
      handleRequestPasswordReset(user.tenant_id, {
        requestId: uuidv4(),
        token: crypto.randomBytes(32).toString('hex'),
        expiresAt: Date.now() + RESET_TOKEN_TTL_MS
      });
      void pumpJobs().catch(error => log.error('Job pump failed after reset request:', error));
      log.info(`Password reset requested for ${email}`);
    } else {
      log.info(`Password reset requested for unknown email ${email}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    log.error('Forgot password error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
