import crypto from 'crypto';

export const VERIFICATION_CODE_TTL_MS = 30 * 60 * 1000;

// 6 digits, like the Cognito codes the original app sent
export function generateVerificationCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}
