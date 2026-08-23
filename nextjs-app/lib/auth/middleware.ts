import { NextRequest } from 'next/server';
import { verifyToken } from './jwt';
import { getLogger } from '@/lib/logger';
import { getAccountState } from '@/lib/queries/account-queries';
import { getUserById } from '@/lib/db/system';

const log = getLogger('auth/middleware');

function getBackgroundProcessorApiKey(): string {
  const key = process.env.BACKGROUND_PROCESSOR_API_KEY;
  if (!key) {
    throw new Error('BACKGROUND_PROCESSOR_API_KEY environment variable must be set');
  }
  return key;
}

export interface AuthResult {
  authenticated: boolean;
  userId?: string;
  tenantId?: string;
  role?: 'admin' | 'member';
  isApiKey?: boolean;
  needsVerification?: boolean;
  error?: string;
}

export function authenticateRequest(request: NextRequest): AuthResult {
  // Check for API Key first
  const apiKey = request.headers.get('X-API-Key');
  if (apiKey && apiKey === getBackgroundProcessorApiKey()) {
    return { authenticated: true, isApiKey: true };
  }

  // Check for JWT
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    log.debug('Auth failed: no credentials on request');
    return { authenticated: false, error: 'No authentication provided' };
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (payload && payload.userId && payload.tenantId) {
    /* The token says who you are; the users table says what you may do and
       whether you are still here. Reading the role from the token would
       leave a demoted or removed person with their old powers until it
       expired - up to a week. One indexed lookup is worth that. */
    const user = getUserById(payload.userId);
    if (!user || user.tenant_id !== payload.tenantId) {
      log.debug('Auth failed: the user no longer exists in that organization');
      return { authenticated: false, error: 'Your access to this organization has been removed' };
    }
    return {
      authenticated: true,
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role,
      isApiKey: false
    };
  }

  log.debug('Auth failed: invalid JWT');
  return { authenticated: false, error: 'Invalid token' };
}

export function requireAuth(request: NextRequest): AuthResult {
  const auth = authenticateRequest(request);
  if (!auth.authenticated) {
    return auth;
  }
  return auth;
}

export function requireAdmin(request: NextRequest): AuthResult {
  const auth = authenticateRequest(request);
  if (!auth.authenticated) {
    return auth;
  }

  if (auth.isApiKey) {
    return auth; // API key has full access
  }

  if (auth.role !== 'admin') {
    return { authenticated: false, error: 'Admin role required' };
  }

  return auth;
}

export function requireApiKey(request: NextRequest): AuthResult {
  const apiKey = request.headers.get('X-API-Key');
  if (!apiKey || apiKey !== getBackgroundProcessorApiKey()) {
    return { authenticated: false, error: 'Valid API key required' };
  }

  return { authenticated: true, isApiKey: true };
}

/* Two gates for people. Everyone in a verified organization can read, and
   can ask for a refresh - that is deliberately not an admin action, because
   "is my parcel moving yet" is the whole point of the product. Everything
   that changes what the organization tracks, who is in it, or who it is,
   needs an admin. */

export function requireVerifiedAdmin(request: NextRequest): AuthResult {
  const auth = requireVerifiedUser(request);
  if (!auth.authenticated) {
    return auth;
  }
  if (auth.role !== 'admin') {
    return { authenticated: false, error: 'Only an admin can do that' };
  }
  return auth;
}

// User routes that touch the account require a verified email, like the
// original's Cognito gate. Replays the account stream (cheap).
export function requireVerifiedUser(request: NextRequest): AuthResult {
  const auth = authenticateRequest(request);
  if (!auth.authenticated || auth.isApiKey || !auth.tenantId) {
    return { authenticated: false, error: auth.error || 'Login required' };
  }
  if (!getAccountState(auth.tenantId).verified) {
    return { authenticated: false, error: 'Verify your email first', needsVerification: true };
  }
  return auth;
}
