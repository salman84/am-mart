#!/usr/bin/env node
/**
 * AM Mart — Asset Generator
 * Creates placeholder PNG assets for development builds.
 * Replace with your real branded assets before App Store / Play Store submission.
 *
 * Usage:  node scripts/generate-assets.js
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');

// ── Minimal valid PNG writer ──────────────────────────────────────────────
const CRC_TABLE = (() => {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const d = Buffer.isBuffer(data) ? data : Buffer.alloc(0);
  const len = Buffer.alloc(4);  len.writeUInt32BE(d.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, d])), 0);
  return Buffer.concat([len, t, d, crcBuf]);
}

/**
 * Create a solid-colour RGBA PNG.
 * @param {number} w Width in pixels
 * @param {number} h Height in pixels
 * @param {number[]} rgba  [R, G, B, A] 0-255
 */
function createPNG(w, h, rgba) {
  const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth per channel
  ihdr[9] = 6;  // RGBA colour type
  // bytes 10,11,12 = 0 (deflate, adaptive filter, no interlace)

  // Build one row: filter-byte(0) + RGBA * width
  const row = Buffer.alloc(1 + w * 4);
  row[0] = 0; // filter: None
  for (let x = 0; x < w; x++) {
    row[1 + x * 4]     = rgba[0];
    row[1 + x * 4 + 1] = rgba[1];
    row[1 + x * 4 + 2] = rgba[2];
    row[1 + x * 4 + 3] = rgba[3];
  }

  // Repeat row h times
  const raw = Buffer.alloc(h * row.length);
  for (let y = 0; y < h; y++) row.copy(raw, y * row.length);

  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([SIG, makeChunk('IHDR', ihdr), makeChunk('IDAT', idat), makeChunk('IEND', Buffer.alloc(0))]);
}

// ── Draw a simple "AM" text overlay using pixel rectangles ────────────────
// (no external font needed — built from a 5x7 pixel grid)
const GLYPH_A = [
  [0,1,1,1,0],
  [1,0,0,0,1],
  [1,1,1,1,1],
  [1,0,0,0,1],
  [1,0,0,0,1],
];
const GLYPH_M = [
  [1,0,0,0,1],
  [1,1,0,1,1],
  [1,0,1,0,1],
  [1,0,0,0,1],
  [1,0,0,0,1],
];

function drawGlyph(pixels, glyph, startX, startY, scale, w, rgba) {
  for (let row = 0; row < glyph.length; row++) {
    for (let col = 0; col < glyph[row].length; col++) {
      if (!glyph[row][col]) continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const px = startX + col * scale + dx;
          const py = startY + row * scale + dy;
          if (px < 0 || px >= w || py < 0) continue;
          const offset = 1 + px * 4; // offset within row (filter byte at 0)
          const rowIdx = py;
          // We'll just store coordinates and apply during PNG creation
          pixels.push({ x: px, y: rowIdx, rgba });
        }
      }
    }
  }
}

function createIconPNG(size) {
  const PRIMARY = [0x10, 0xb9, 0x81, 0xff]; // #10B981 green
  const WHITE   = [0xff, 0xff, 0xff, 0xff];

  // Build pixel array
  const pixelMap = new Map(); // "x,y" → rgba

  // Fill background with primary colour
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      pixelMap.set(`${x},${y}`, PRIMARY);

  // Draw "AM" centred
  const glyphScale = Math.max(1, Math.floor(size / 60));
  const glyphW = 5 * glyphScale;
  const gap = glyphScale * 2;
  const totalW = glyphW * 2 + gap;
  const totalH = 5 * glyphScale;
  const startX = Math.floor((size - totalW) / 2);
  const startY = Math.floor((size - totalH) / 2);

  const pixels = [];
  drawGlyph(pixels, GLYPH_A, startX, startY, glyphScale, size, WHITE);
  drawGlyph(pixels, GLYPH_M, startX + glyphW + gap, startY, glyphScale, size, WHITE);

  for (const p of pixels) pixelMap.set(`${p.x},${p.y}`, p.rgba);

  // Build PNG row by row
  const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;

  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    const rowOffset = y * (1 + size * 4);
    raw[rowOffset] = 0;
    for (let x = 0; x < size; x++) {
      const col = pixelMap.get(`${x},${y}`) || PRIMARY;
      raw[rowOffset + 1 + x * 4]     = col[0];
      raw[rowOffset + 1 + x * 4 + 1] = col[1];
      raw[rowOffset + 1 + x * 4 + 2] = col[2];
      raw[rowOffset + 1 + x * 4 + 3] = col[3];
    }
  }

  const idat = zlib.deflateSync(raw, { level: 6 });
  return Buffer.concat([SIG, makeChunk('IHDR', ihdr), makeChunk('IDAT', idat), makeChunk('IEND', Buffer.alloc(0))]);
}

// ── Generate all required assets ──────────────────────────────────────────
function main() {
  if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });

  const GREEN  = [0x10, 0xb9, 0x81, 0xff];  // #10B981
  const WHITE  = [0xff, 0xff, 0xff, 0xff];
  const TRANSP = [0x10, 0xb9, 0x81, 0x00];  // transparent

  const files = [
    { name: 'icon.png',            fn: () => createIconPNG(1024) },
    { name: 'adaptive-icon.png',   fn: () => createIconPNG(1024) },
    { name: 'splash.png',          fn: () => createPNG(1284, 2778, GREEN) },
    { name: 'favicon.png',         fn: () => createIconPNG(32) },
    { name: 'notification-icon.png', fn: () => createPNG(96, 96, WHITE) },
  ];

  console.log('\n🎨  AM Mart — Generating placeholder assets...\n');
  for (const { name, fn } of files) {
    const dest = path.join(ASSETS_DIR, name);
    if (fs.existsSync(dest)) {
      console.log(`  ⏭️  Skipping  ${name}  (already exists)`);
      continue;
    }
    try {
      fs.writeFileSync(dest, fn());
      console.log(`  ✅  Created   ${name}`);
    } catch (err) {
      console.error(`  ❌  Failed    ${name}: ${err.message}`);
    }
  }

  console.log(`
✅  Assets written to: ${ASSETS_DIR}

⚠️  These are PLACEHOLDER icons for development builds.
    Replace them with your real branded assets before submitting to:
      • Google Play Store  (icon.png must be 512×512 for store listing)
      • Apple App Store    (icon.png must be 1024×1024 with no alpha)

    Recommended tools for creating proper icons:
      • Figma / Adobe Illustrator for vector design
      • expo-image-picker for quick testing
      • https://appicon.co  for generating all iOS/Android sizes at once
      • npx expo-optimize  to compress assets after replacing
`);
}

main();
