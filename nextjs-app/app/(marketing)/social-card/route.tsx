import { ImageResponse } from 'next/og';

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background: '#0f172a',
          color: 'white',
          display: 'flex',
          height: '100%',
          justifyContent: 'center',
          padding: '72px',
          width: '100%'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '980px', width: '100%' }}>
          <div style={{ alignItems: 'center', display: 'flex', fontSize: 34, fontWeight: 700 }}>
            <div
              style={{
                alignItems: 'center',
                background: '#3b82f6',
                borderRadius: 16,
                display: 'flex',
                height: 66,
                justifyContent: 'center',
                marginRight: 22,
                width: 66
              }}
            >
              C
            </div>
            CargoPax
          </div>
          <div style={{ fontSize: 64, fontWeight: 750, letterSpacing: '-2px', lineHeight: 1.1, marginTop: 62 }}>
            Your parcels, tracked from the emails you already get
          </div>
          <div style={{ color: '#bfdbfe', fontSize: 28, lineHeight: 1.4, marginTop: 34 }}>
            One forwarded message. One shared view. Six major carriers.
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' }
    }
  );
}
