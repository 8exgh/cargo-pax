// Renders every icon the site ships from the drawing in brand-mark.mjs. Run
// after changing the mark:  node scripts/generate-icons.mjs
//
// A kraft parcel with a map pin standing on it: what the product does, in
// one glance, on the brand blue. Isometric so it reads as a box and not a
// square, warm cardboard so it stands apart from every other blue app tile.
//
// Outputs (all derived, never hand-edited):
//   public/logo.svg              rounded tile, used inline by the pages
//   app/icon.svg                 the favicon Next links for modern browsers
//   app/favicon.ico              16/32/48 fallback for everything else
//   public/icon-192.png,         manifest icons, purpose "any": rounded
//   public/icon-512.png            corners on a transparent square
//   public/icon-maskable-512.png full-bleed, mark inside the 80% safe zone
//   public/apple-touch-icon.png  180px, full-bleed (iOS rounds it itself)
//   public/badge-96.png          white silhouette for the Android status bar
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { badge, tile } from './brand-mark.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// An .ico is a small directory of images; PNG entries have been fine in
// every browser (and Windows) for well over a decade, so no BMP encoding.
function ico(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const entries = [];
  let offset = 6 + 16 * pngs.length;
  for (const { size, data } of pngs) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0);
    entry.writeUInt8(size === 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += data.length;
  }
  return Buffer.concat([header, ...entries, ...pngs.map(p => p.data)]);
}

const png = (svg, size) => sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();

const rounded = tile();
const bleed = tile({ bleed: true, scale: 0.92 });
const maskable = tile({ bleed: true, scale: 0.76 });

await mkdir(path.join(root, 'public'), { recursive: true });
await writeFile(path.join(root, 'public/logo.svg'), rounded);
await writeFile(path.join(root, 'app/icon.svg'), rounded);
await writeFile(path.join(root, 'public/icon-192.png'), await png(rounded, 192));
await writeFile(path.join(root, 'public/icon-512.png'), await png(rounded, 512));
await writeFile(path.join(root, 'public/icon-maskable-512.png'), await png(maskable, 512));
await writeFile(path.join(root, 'public/apple-touch-icon.png'), await png(bleed, 180));
await writeFile(path.join(root, 'public/badge-96.png'), await png(badge(), 96));
await writeFile(
  path.join(root, 'app/favicon.ico'),
  ico(await Promise.all([16, 32, 48].map(async size => ({ size, data: await png(rounded, size) }))))
);
console.log('icons written');
