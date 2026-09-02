// Renders the eight-second silent promo to public/promo.mp4.
//
//   node scripts/render-promo.mjs              # the video
//   node scripts/render-promo.mjs --keyframes  # a contact sheet to eyeball
//
// Every frame is an SVG drawn by frame(t) and rasterised with sharp, then
// ffmpeg strings the frames into H.264 (the one codec every social network
// takes). Needs an ffmpeg with libx264 on PATH or in $FFMPEG, and Lato
// installed for the type - a fallback face will render, just less well.
//
// Square, because a feed post is where this runs: the link sits above it,
// the video makes the case in four beats and points back up.
//
//   0.0-2.3  shipping emails pile in
//   2.2-4.4  they get forwarded to your @cargopax.ca address
//   4.3-6.3  the shared dashboard, one parcel ticking over to delivered
//   6.2-8.0  the mark, the name, cargopax.ca, tap the link above
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { tile } from './brand-mark.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const W = 1080;
const H = 1080;
const FPS = 30;
const SECONDS = 8;
const FONT = 'Lato, "Noto Sans", "Liberation Sans", sans-serif';

/* ---- motion helpers ---------------------------------------------------- */

const clamp = x => Math.min(1, Math.max(0, x));
const lerp = (a, b, p) => a + (b - a) * p;
// 0 before `from`, 1 after `to`, eased in between
const span = (t, from, to, ease = easeOut) => ease(clamp((t - from) / (to - from)));
const easeOut = p => 1 - Math.pow(1 - p, 3);
const easeIn = p => p * p * p;
const easeInOut = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
// overshoots a little then settles: for things that pop into place
const easeBack = p => 1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2);
const linear = p => p;

// A scene's group: fades and rises in, fades and drifts out. `visible` is 0
// when the scene is entirely off so the caller can skip drawing it.
function scene(t, enterAt, exitAt, { enterFor = 0.45, exitFor = 0.35 } = {}) {
  const enter = span(t, enterAt, enterAt + enterFor);
  const exit = 1 - span(t, exitAt, exitAt + exitFor, easeIn);
  const visible = enter * exit;
  const dy = lerp(28, 0, enter) + lerp(0, -20, 1 - exit);
  return { visible, wrap: inner => (visible <= 0 ? '' : `<g opacity="${visible}" transform="translate(0 ${dy})">${inner}</g>`) };
}

/* ---- drawing helpers --------------------------------------------------- */

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function text(x, y, str, { size = 32, weight = 400, fill = '#fff', anchor = 'start', spacing = 0, opacity = 1 } = {}) {
  return `<text x="${x}" y="${y}" font-family='${FONT}' font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${spacing}" opacity="${opacity}">${esc(str)}</text>`;
}

// Lato has no metrics we can ask for from here; a pill is sized from an
// average glyph width, which is close enough for the labels used.
function pill(cx, cy, label, { bg, fg, size = 22, weight = 700, h = 40, pad = 18 }) {
  const w = label.length * size * 0.58 + pad * 2;
  return `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="${bg}"/>${text(cx, cy + size * 0.35, label, { size, weight, fill: fg, anchor: 'middle' })}`;
}

const brandTile = `data:image/svg+xml;base64,${Buffer.from(tile()).toString('base64')}`;
const logo = (x, y, size) => `<image href="${brandTile}" x="${x}" y="${y}" width="${size}" height="${size}"/>`;

function wordmark(x, y, size, { weight = 800, pax = '#93c5fd' } = {}) {
  // "Cargo" then "Pax" in the accent, laid out as one run so the gap is right
  return `<text x="${x}" y="${y}" font-family='${FONT}' font-size="${size}" font-weight="${weight}" fill="#fff" letter-spacing="-1">Cargo<tspan fill="${pax}">Pax</tspan></text>`;
}

/* ---- content ----------------------------------------------------------- */

const EMAILS = [
  { from: 'Northwind Supply', subject: 'Your order #48213 has shipped', link: 'UPS 1Z 999 AA1 01 2345 6784', hue: '#f59e0b', rot: -3 },
  { from: 'Contoso Parts', subject: 'Your package is on its way', link: 'FedEx 7489 2345 1234', hue: '#8b5cf6', rot: 2 },
  { from: 'Canada Post', subject: 'Shipment notification', link: '7023 2100 0001 2345', hue: '#ef4444', rot: -1.5 }
];

const CARRIER = {
  UPS: { bg: '#3d2314', fg: '#ffb500' },
  FedEx: { bg: '#4d148c', fg: '#ffffff' },
  'Canada Post': { bg: '#e31837', fg: '#ffffff' },
  Purolator: { bg: '#0f2f6e', fg: '#ffffff' }
};
const STATUS = {
  'Label created': { bg: '#e5e7eb', fg: '#374151' },
  'In transit': { bg: '#dbeafe', fg: '#1d4ed8' },
  'Out for delivery': { bg: '#fef3c7', fg: '#b45309' },
  Delivered: { bg: '#dcfce7', fg: '#15803d' }
};
const ROWS = [
  { carrier: 'UPS', number: '1Z 999 AA1 01 2345 6784', status: 'Out for delivery' },
  { carrier: 'FedEx', number: '7489 2345 1234', status: 'In transit' },
  { carrier: 'Canada Post', number: '7023 2100 0001 2345', status: 'In transit', flipsTo: 'Delivered' },
  { carrier: 'Purolator', number: '3200 1234 5678', status: 'Label created' }
];

/* ---- pieces ------------------------------------------------------------ */

function emailCard(e, cx, cy, w = 720, h = 168) {
  const x = cx - w / 2;
  const y = cy - h / 2;
  return `<g filter="url(#shadow)"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="22" fill="#ffffff"/></g>
    <circle cx="${x + 62}" cy="${cy}" r="30" fill="${e.hue}"/>
    ${text(x + 62, cy + 11, e.from[0], { size: 30, weight: 800, fill: '#fff', anchor: 'middle' })}
    ${text(x + 116, y + 54, e.from, { size: 24, weight: 700, fill: '#111827' })}
    ${text(x + w - 30, y + 54, '9:41 AM', { size: 20, fill: '#9ca3af', anchor: 'end' })}
    ${text(x + 116, y + 92, e.subject, { size: 26, weight: 600, fill: '#1f2937' })}
    ${text(x + 116, y + 130, 'Track your package: ', { size: 22, fill: '#6b7280' })}
    ${text(x + 116 + 'Track your package: '.length * 22 * 0.5, y + 130, e.link, { size: 22, weight: 600, fill: '#2563eb' })}`;
}

function addressChip(cx, cy, scale = 1) {
  const w = 700;
  const h = 128;
  return `<g transform="translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})">
    <g filter="url(#shadow)"><rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="#ffffff"/></g>
    <g transform="translate(${cx - w / 2 + 44} ${cy - 26})">
      <rect width="64" height="52" rx="10" fill="#dbeafe"/>
      <path d="M6 10 L32 30 L58 10" fill="none" stroke="#2563eb" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    ${text(cx - w / 2 + 132, cy + 15, 'yours', { size: 44, weight: 700, fill: '#111827' })}
    ${text(cx - w / 2 + 132 + 'yours'.length * 44 * 0.5, cy + 15, '@cargopax.ca', { size: 44, weight: 700, fill: '#2563eb' })}
  </g>`;
}

function dashboard(t, cx, cy) {
  const w = 880;
  const h = 560;
  const x = cx - w / 2;
  const y = cy - h / 2;
  const out = [];
  out.push(`<g filter="url(#shadow)"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="26" fill="#ffffff"/></g>`);
  // header, like the app's own
  out.push(`<rect x="${x}" y="${y}" width="${w}" height="92" rx="26" fill="#f9fafb"/><rect x="${x}" y="${y + 60}" width="${w}" height="32" fill="#f9fafb"/>`);
  out.push(`<line x1="${x}" y1="${y + 92}" x2="${x + w}" y2="${y + 92}" stroke="#e5e7eb" stroke-width="2"/>`);
  out.push(logo(x + 30, y + 24, 44));
  out.push(text(x + 90, y + 60, 'Acme Tools', { size: 30, weight: 700, fill: '#111827' }));
  out.push(text(x + w - 30, y + 58, '4 parcels · 3 people', { size: 22, fill: '#6b7280', anchor: 'end' }));

  ROWS.forEach((row, i) => {
    const enter = span(t, 4.55 + i * 0.13, 4.95 + i * 0.13, easeOut);
    if (enter <= 0) {
      return;
    }
    const ry = y + 92 + 58 + i * 112;
    const dx = lerp(60, 0, enter);
    let status = row.status;
    let pop = 1;
    if (row.flipsTo) {
      const flip = span(t, 5.3, 5.6, easeBack);
      if (flip > 0) {
        status = row.flipsTo;
        pop = lerp(0.6, 1, flip);
      }
    }
    const s = STATUS[status];
    const c = CARRIER[row.carrier];
    out.push(`<g opacity="${enter}" transform="translate(${dx} 0)">
      ${i > 0 ? `<line x1="${x + 30}" y1="${ry - 56}" x2="${x + w - 30}" y2="${ry - 56}" stroke="#f3f4f6" stroke-width="2"/>` : ''}
      ${pill(x + 30 + (row.carrier.length * 22 * 0.58 + 36) / 2, ry, row.carrier, { bg: c.bg, fg: c.fg, size: 22, h: 44 })}
      ${text(x + 230, ry + 10, row.number, { size: 28, weight: 600, fill: '#1f2937', spacing: 0.5 })}
      <g transform="translate(${x + w - 130} ${ry}) scale(${pop}) translate(${-(x + w - 130)} ${-ry})">
        ${pill(x + w - 130, ry, status === 'Delivered' ? 'Delivered ✓' : status, { bg: s.bg, fg: s.fg, size: 22, h: 44 })}
      </g>
    </g>`);
  });
  return out.join('\n');
}

function toast(t) {
  const enter = span(t, 5.5, 5.9, easeBack);
  if (enter <= 0) {
    return '';
  }
  const w = 640;
  const h = 112;
  const x = W / 2 - w / 2;
  const y = lerp(-140, 330, enter);
  return `<g opacity="${clamp(enter * 1.4)}">
    <g filter="url(#shadow)"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="28" fill="#111827"/></g>
    ${logo(x + 22, y + 22, 68)}
    ${text(x + 112, y + 46, 'CargoPax · now', { size: 22, weight: 700, fill: '#93c5fd' })}
    ${text(x + 112, y + 84, 'Delivered: Canada Post 7023 2100 0001 2345', { size: 24, weight: 600, fill: '#ffffff' })}
  </g>`;
}

/* ---- the frame --------------------------------------------------------- */

function frame(t) {
  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0f172a"/>
      <stop offset="1" stop-color="#172554"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#3b82f6" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#3b82f6" stop-opacity="0"/>
    </radialGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="14"/>
      <feOffset dy="12" result="b"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.45"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="${W * 0.78}" cy="${H * 0.22 + Math.sin(t * 0.9) * 20}" r="520" fill="url(#glow)"/>`);

  /* 1. the pile of emails */
  const s1 = scene(t, 0.05, 2.05);
  if (s1.visible > 0) {
    const pieces = [];
    pieces.push(text(540, 250, 'Shipping emails', { size: 88, weight: 900, fill: '#fff', anchor: 'middle', spacing: -2 }));
    pieces.push(text(540, 350, 'pile up.', { size: 88, weight: 900, fill: '#93c5fd', anchor: 'middle', spacing: -2 }));
    out.push(s1.wrap(pieces.join('')));
  }
  // the cards outlive the headline: they fly off into the address chip
  EMAILS.forEach((e, i) => {
    const enter = span(t, 0.45 + i * 0.28, 1.0 + i * 0.28, easeBack);
    if (enter <= 0) {
      return;
    }
    const restX = 540 + (i - 1) * 8;
    const restY = 545 + i * 185;
    const fly = span(t, 2.2 + i * 0.14, 2.8 + i * 0.14, easeIn);
    const cx = lerp(lerp(restX + 500, restX, enter), 540, fly);
    const cy = lerp(restY, 620, fly);
    const scale = lerp(1, 0.08, fly);
    const rot = lerp(e.rot, 0, fly);
    const opacity = Math.min(enter, 1) * (1 - span(t, 2.6 + i * 0.14, 2.8 + i * 0.14, linear));
    if (opacity <= 0) {
      return;
    }
    out.push(`<g opacity="${opacity}" transform="translate(${cx} ${cy}) rotate(${rot}) scale(${scale}) translate(${-cx} ${-cy})">${emailCard(e, cx, cy)}</g>`);
  });

  /* 2. forward them to your own address */
  const s2 = scene(t, 2.15, 4.05);
  if (s2.visible > 0) {
    const pieces = [];
    pieces.push(text(540, 250, 'Forward them to', { size: 80, weight: 900, fill: '#fff', anchor: 'middle', spacing: -2 }));
    pieces.push(text(540, 350, 'your own address.', { size: 80, weight: 900, fill: '#93c5fd', anchor: 'middle', spacing: -2 }));
    // the chip pops in, then bumps as each email lands in it
    let scale = lerp(0.6, 1, span(t, 2.3, 2.75, easeBack));
    for (let i = 0; i < EMAILS.length; i++) {
      const hit = 2.8 + i * 0.14;
      if (t > hit && t < hit + 0.25) {
        scale += Math.sin(((t - hit) / 0.25) * Math.PI) * 0.05;
      }
    }
    pieces.push(addressChip(540, 620, scale));
    const done = span(t, 3.25, 3.65, easeBack);
    if (done > 0) {
      pieces.push(`<g opacity="${clamp(done)}" transform="translate(540 790) scale(${lerp(0.5, 1, done)}) translate(-540 -790)">
        <circle cx="540" cy="790" r="44" fill="#22c55e"/>
        <path d="M518 790 L534 806 L564 774" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
      </g>`);
      pieces.push(text(540, 890, 'Nothing to copy. No extension.', { size: 34, weight: 600, fill: '#bfdbfe', anchor: 'middle', opacity: clamp(done) }));
    }
    out.push(s2.wrap(pieces.join('')));
  }

  /* 3. the shared dashboard */
  const s3 = scene(t, 4.25, 6.05);
  if (s3.visible > 0) {
    const pieces = [];
    pieces.push(text(540, 200, 'Every parcel, tracked.', { size: 72, weight: 900, fill: '#fff', anchor: 'middle', spacing: -2 }));
    pieces.push(text(540, 282, 'Shared with your whole team.', { size: 48, weight: 700, fill: '#93c5fd', anchor: 'middle', spacing: -1 }));
    pieces.push(dashboard(t, 540, 660));
    pieces.push(toast(t));
    out.push(s3.wrap(pieces.join('')));
  }

  /* the brand: a small lockup in the corner that grows into the end card */
  const grow = span(t, 6.2, 6.8, easeInOut);
  const cornerIn = span(t, 0.2, 0.7);
  {
    const size = lerp(64, 250, grow);
    const x = lerp(64, 540 - 125, grow);
    const y = lerp(56, 250, grow);
    const opacity = lerp(0, 1, cornerIn);
    out.push(`<g opacity="${opacity}">${logo(x, y, size)}</g>`);
    const wordmarkOut = 1 - span(t, 6.15, 6.35);
    if (wordmarkOut > 0) {
      out.push(`<g opacity="${opacity * wordmarkOut}">${wordmark(64 + 64 + 18, 56 + 46, 40)}</g>`);
    }
  }

  /* 4. the end card */
  const s4 = span(t, 6.55, 7.0);
  if (s4 > 0) {
    const bob = Math.sin((t - 7.0) * 5) * 6;
    const cta = span(t, 6.95, 7.4);
    out.push(`<g opacity="${s4}" transform="translate(0 ${lerp(20, 0, s4)})">
      ${wordmark(540 - 172, 620, 112, { weight: 900 })}
    </g>`);
    out.push(`<g opacity="${cta}" transform="translate(0 ${lerp(16, 0, cta)})">
      ${text(540, 740, 'Create your account at', { size: 36, weight: 600, fill: '#bfdbfe', anchor: 'middle' })}
      ${text(540, 830, 'cargopax.ca', { size: 84, weight: 900, fill: '#f2be6b', anchor: 'middle', spacing: -1 })}
      <g transform="translate(0 ${bob})">
        <path d="M540 900 L540 960 M516 924 L540 900 L564 924" fill="none" stroke="#93c5fd" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
        ${text(540, 1010, 'Tap the link above', { size: 34, weight: 700, fill: '#93c5fd', anchor: 'middle' })}
      </g>
    </g>`);
  }

  out.push('</svg>');
  return out.join('\n');
}

/* ---- output ------------------------------------------------------------ */

const png = (t, size = W) => sharp(Buffer.from(frame(t))).resize(size, size).png().toBuffer();

async function keyframes() {
  const times = [0.3, 1.2, 2.0, 2.5, 3.0, 3.8, 4.8, 5.4, 6.0, 6.6, 7.2, 7.9];
  const size = 360;
  const cols = 4;
  const tiles = await Promise.all(times.map(t => png(t, size)));
  const comps = tiles.map((input, i) => ({ input, left: (i % cols) * (size + 8), top: Math.floor(i / cols) * (size + 8) }));
  const rows = Math.ceil(times.length / cols);
  const outFile = process.argv[3] || path.join(os.tmpdir(), 'promo-keyframes.png');
  await sharp({ create: { width: cols * (size + 8), height: rows * (size + 8), channels: 4, background: '#000' } })
    .composite(comps)
    .png()
    .toFile(outFile);
  console.log(`keyframes at ${times.join(', ')}s -> ${outFile}`);
}

async function video() {
  const work = await mkdtemp(path.join(process.env.PROMO_WORK_DIR || os.tmpdir(), 'cargopax-promo-'));
  const total = FPS * SECONDS;
  const batch = 8;
  for (let start = 0; start < total; start += batch) {
    await Promise.all(
      Array.from({ length: Math.min(batch, total - start) }, async (_, k) => {
        const n = start + k;
        await writeFile(path.join(work, `frame-${String(n).padStart(4, '0')}.png`), await png(n / FPS));
      })
    );
    process.stdout.write(`\r${Math.min(start + batch, total)}/${total} frames`);
  }
  process.stdout.write('\n');
  const outFile = path.join(root, 'public', 'promo.mp4');
  await mkdir(path.dirname(outFile), { recursive: true });
  // yuv420p and an even size are what every player wants; faststart puts
  // the index first so it streams from the site instead of downloading
  execFileSync(
    process.env.FFMPEG || 'ffmpeg',
    ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(work, 'frame-%04d.png'),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', outFile],
    { stdio: 'inherit' }
  );
  await rm(work, { recursive: true, force: true });
  console.log(`wrote ${outFile}`);
}

if (process.argv[2] === '--keyframes') {
  await keyframes();
} else {
  await video();
}
