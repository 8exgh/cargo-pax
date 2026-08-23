import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { requireVerifiedAdmin } from '@/lib/auth/middleware';
import { serverError, unauthorized } from '@/lib/api/respond';
import { createUser, getUserByEmail } from '@/lib/db/system';
import { hashPassword } from '@/lib/auth/password';
import { handleInviteMember } from '@/lib/commands/account-commands';
import { pumpJobs } from '@/lib/jobs';
import { generatePassword } from '@/lib/migadu';
import { getLogger } from '@/lib/logger';

const log = getLogger('api/commands/invite-member');

const Schema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member']).default('member')
});

/* Adds someone to the organization. They get a one-time password by email
   and must change it on first sign-in (the users table has carried
   must_change_password since the template). New people are read-only unless
   an admin says otherwise. */
export async function POST(request: NextRequest) {
  try {
    const auth = requireVerifiedAdmin(request);
    if (!auth.authenticated || !auth.tenantId || !auth.userId) {
      return unauthorized(auth);
    }

    const validation = Schema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }
    const email = validation.data.email.trim().toLowerCase();
    const role = validation.data.role;

    if (getUserByEmail(email)) {
      return NextResponse.json({ error: 'Someone with that email already has an account' }, { status: 409 });
    }

    // Long enough that emailing it is not the weak link, and single use in
    // practice because the first sign-in forces a change.
    const temporaryPassword = `${generatePassword()}1a`;
    const userId = uuidv4();

    createUser({
      id: userId,
      tenant_id: auth.tenantId,
      email,
      password_hash: await hashPassword(temporaryPassword),
      role,
      must_change_password: 1
    });

    handleInviteMember(auth.tenantId, {
      userId,
      email,
      role,
      invitedBy: auth.userId,
      temporaryPassword
    });

    void pumpJobs().catch(error => log.error('Job pump failed after invite:', error));

    log.info(`Invited ${email} as ${role} to tenant ${auth.tenantId}`);
    return NextResponse.json({ success: true, userId, email, role }, { status: 201 });
  } catch (error: any) {
    log.error('Invite member error:', error);
    return serverError(error);
  }
}
