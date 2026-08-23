import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getUserById } from '@/lib/db/system';

// Who am I? Lets the UI show the signed-in email without decoding the JWT.
export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.authenticated || !auth.userId) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }
  const user = getUserById(auth.userId);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  return NextResponse.json({ userId: user.id, tenantId: user.tenant_id, email: user.email });
}
