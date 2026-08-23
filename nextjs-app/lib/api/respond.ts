import { NextResponse } from 'next/server';
import { AuthResult } from '@/lib/auth/middleware';

// 401 for missing/bad credentials, 403 (+needsVerification) for an
// unverified account, so the UI can send the user to the verify page.
export function unauthorized(auth: AuthResult): NextResponse {
  if (auth.needsVerification) {
    return NextResponse.json({ error: auth.error, needsVerification: true }, { status: 403 });
  }
  return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
}

export function serverError(error: any): NextResponse {
  return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
}
