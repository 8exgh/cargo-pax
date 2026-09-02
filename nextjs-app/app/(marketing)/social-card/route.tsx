import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';

/* The Open Graph image every public page shares. The mark is the same SVG
   the pages use, read from public/ so a redrawn logo shows up here without
   a second copy to forget. */

export async function GET() {
  const svg = await readFile(path.join(process.cwd(), 'public', 'logo.svg'));
  const mark = `data:image/svg+xml;base64,${svg.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #172554 100%)',
          color: 'white',
          display: 'flex',
          height: '100%',
          justifyContent: 'center',
          padding: '72px',
          width: '100%'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '1000px', width: '100%' }}>
          <div style={{ alignItems: 'center', display: 'flex', fontSize: 40, fontWeight: 700, letterSpacing: '-1px' }}>
            <img src={mark} width={84} height={84} style={{ marginRight: 24 }} />
            <span>Cargo</span>
            <span style={{ color: '#93c5fd' }}>Pax</span>
          </div>
          <div style={{ fontSize: 64, fontWeight: 750, letterSpacing: '-2px', lineHeight: 1.1, marginTop: 58 }}>
            Your parcels, tracked from the emails you already get
          </div>
          <div style={{ color: '#bfdbfe', fontSize: 28, lineHeight: 1.4, marginTop: 30 }}>
            One forwarded message. One shared view. Six major carriers.
          </div>
          <div style={{ color: '#f2be6b', fontSize: 24, fontWeight: 600, marginTop: 44 }}>cargopax.ca</div>
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
