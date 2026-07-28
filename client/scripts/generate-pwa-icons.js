// Generates the PWA icon set (client/public/pwa-*.png, apple-touch-icon.png,
// favicon.ico) as plain solid-color PNGs with a blocky "P" glyph, using only
// Node's built-in zlib — no image-processing dependency in the repo.
//
// Run: node scripts/generate-pwa-icons.js

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BG = [0x1a, 0x09, 0x33]; // #1a0933
const FG = [0xd9, 0x46, 0xef]; // #d946ef (accent)

// 5x7 blocky "P" bitmap font (1 = foreground pixel).
const GLYPH_P = [
  [1, 1, 1, 1, 0],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
  [1, 1, 1, 1, 0],
  [1, 0, 0, 0, 0],
  [1, 0, 0, 0, 0],
  [1, 0, 0, 0, 0],
];

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// Renders the glyph centered, covering ~65% of the square, then encodes a
// standard 8-bit RGBA PNG.
function renderIconPng(size) {
  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const o = (y * size + x) * 4;
      pixels[o] = BG[0];
      pixels[o + 1] = BG[1];
      pixels[o + 2] = BG[2];
      pixels[o + 3] = 255;
    }
  }

  const glyphCols = GLYPH_P[0].length;
  const glyphRows = GLYPH_P.length;
  const targetH = Math.round(size * 0.62);
  const cell = Math.round(targetH / glyphRows);
  const targetW = cell * glyphCols;
  const offsetX = Math.round((size - targetW) / 2);
  const offsetY = Math.round((size - cell * glyphRows) / 2);

  for (let gy = 0; gy < glyphRows; gy++) {
    for (let gx = 0; gx < glyphCols; gx++) {
      if (!GLYPH_P[gy][gx]) continue;
      const px0 = offsetX + gx * cell;
      const py0 = offsetY + gy * cell;
      for (let py = py0; py < py0 + cell; py++) {
        for (let px = px0; px < px0 + cell; px++) {
          if (px < 0 || py < 0 || px >= size || py >= size) continue;
          const o = (py * size + px) * 4;
          pixels[o] = FG[0];
          pixels[o + 1] = FG[1];
          pixels[o + 2] = FG[2];
          pixels[o + 3] = 255;
        }
      }
    }
  }

  // Raw scanlines, each prefixed with filter-type byte 0 (None).
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4);
    raw[rowStart] = 0;
    pixels.copy(raw, rowStart + 1, y * size * 4, (y + 1) * size * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = zlib.deflateSync(raw, { level: 9 });

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Wraps a PNG buffer in a minimal single-image ICO container (the modern
// "PNG-in-ICO" format every current browser/OS accepts).
function pngToIco(pngBuf, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // image count

  const entry = Buffer.alloc(16);
  entry[0] = size >= 256 ? 0 : size; // width (0 = 256)
  entry[1] = size >= 256 ? 0 : size; // height
  entry[2] = 0; // color palette
  entry[3] = 0; // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(pngBuf.length, 8); // image data size
  entry.writeUInt32LE(header.length + entry.length, 12); // offset

  return Buffer.concat([header, entry, pngBuf]);
}

const publicDir = path.resolve(__dirname, '..', 'public');
fs.mkdirSync(publicDir, { recursive: true });

const png192 = renderIconPng(192);
const png512 = renderIconPng(512);
const png180 = renderIconPng(180);
const png32 = renderIconPng(32);

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), png192);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), png512);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), png180);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), pngToIco(png32, 32));

console.log('Generated pwa-192x192.png, pwa-512x512.png, apple-touch-icon.png, favicon.ico in client/public/');
