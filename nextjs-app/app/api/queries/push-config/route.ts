import { NextResponse } from 'next/server';
import { pushPublicKey } from '@/lib/push';

// The VAPID public key the browser needs to subscribe. Public by design -
// it is the half of the keypair that is meant to be handed out - and served
// rather than baked in at build time so rotating it needs no rebuild.
export const dynamic = 'force-dynamic';

export async function GET() {
  const key = pushPublicKey();
  return NextResponse.json({ enabled: Boolean(key), publicKey: key });
}
