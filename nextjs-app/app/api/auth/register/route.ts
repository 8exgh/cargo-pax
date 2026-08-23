import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { createTenantWithAdmin, getUserByEmail } from '@/lib/db/system';
import { hashPassword, validatePassword } from '@/lib/auth/password';
import { signToken } from '@/lib/auth/jwt';
import { generateVerificationCode, VERIFICATION_CODE_TTL_MS } from '@/lib/auth/verification';
import { handleCreateAccount, handleIssueVerificationCode } from '@/lib/commands/account-commands';
import { mailboxAvailability, normalizeLocalPart } from '@/lib/mailbox';
import { pumpJobs } from '@/lib/jobs';
import { getMailDomain } from '@/lib/site';
import { getLogger } from '@/lib/logger';

const log = getLogger('api/auth/register');

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  emailIdentifier: z.string().min(1).max(64),
  organizationName: z.string().trim().min(1).max(120)
});

// Signup creates an organization and makes the registrant its admin: the
// tenant, its first user, and the account stream (account_created,
// organization_named, cargo_pax_email_identifier_assigned), then a
// verification code the send-verification-email job mails. Login is allowed
// once verified. Everyone else joins by invitation from an admin.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = RegisterSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { password } = validation.data;
    const email = validation.data.email.trim().toLowerCase();
    const mailboxDomain = getMailDomain();
    const emailIdentifier = normalizeLocalPart(validation.data.emailIdentifier);

    if (getUserByEmail(email)) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.message },
        { status: 400 }
      );
    }

    const availability = await mailboxAvailability(emailIdentifier, mailboxDomain);
    if (!availability.available) {
      return NextResponse.json(
        { error: availability.reason || 'That address is taken.', field: 'emailIdentifier' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const tenantId = uuidv4();
    const userId = uuidv4();
    try {
      createTenantWithAdmin({ tenantId, userId, email, passwordHash, mailboxLocalPart: emailIdentifier });
    } catch (error: any) {
      // The UNIQUE index on the address is the race guard
      if (String(error?.message || '').includes('UNIQUE')) {
        return NextResponse.json(
          { error: 'That address is taken.', field: 'emailIdentifier' },
          { status: 409 }
        );
      }
      throw error;
    }

    handleCreateAccount(tenantId, {
      email,
      emailIdentifier,
      mailboxDomain,
      organizationName: validation.data.organizationName
    });
    handleIssueVerificationCode(tenantId, {
      code: generateVerificationCode(),
      expiresAt: Date.now() + VERIFICATION_CODE_TTL_MS
    });

    // Send the code, provision the inbox, notify the owner: off the response
    void pumpJobs().catch(error => log.error('Job pump failed after registration:', error));

    // The token lets the verify page act for this account; the dashboard
    // itself stays behind the verification gate.
    const token = signToken({ userId, tenantId, role: 'admin' });

    log.info(`Registered ${email} as admin of "${validation.data.organizationName}" with address ${emailIdentifier}@${mailboxDomain} (user ${userId}, tenant ${tenantId})`);
    return NextResponse.json({
      userId,
      token,
      needsVerification: true,
      forwardingAddress: `${emailIdentifier}@${mailboxDomain}`
    });
  } catch (error: any) {
    log.error('Registration error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
