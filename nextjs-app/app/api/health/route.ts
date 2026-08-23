import { NextResponse } from 'next/server';

// Used by the Docker HEALTHCHECK and the deploy workflow's readiness loop
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    commit: process.env.GIT_COMMIT || 'dev',
    buildTime: process.env.BUILD_TIME || 'unknown'
  });
}
