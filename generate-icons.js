// Node.js script to create PNG icons using built-in zlib
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function createPng(width, height, drawFn) {
  // RGBA buffer: width * height * 4
  const rawData = Buffer.alloc(height * (1 + width * 4));
  
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 4);
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);

  // Helper for CRC32
  function crc32(buf) {
    let table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[n] = c;
    }
    let crc = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
  }

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4);
    data.copy(buf, 8);
    const crc = crc32(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type 6: RGBA
  ihdrData[10] = 0; // compression method
  ihdrData[11] = 0; // filter method
  ihdrData[12] = 0; // interlace method
  const ihdr = makeChunk('IHDR', ihdrData);

  // IDAT
  const idat = makeChunk('IDAT', compressedData);

  // IEND
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// Icon generator with dark slate background, emerald/pink rings and R$
function drawIcon(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.hypot(x - cx, y - cy);

  // Rounded squircle mask
  const cornerRadius = w * 0.22;
  const dx = Math.max(0, Math.abs(x - cx) - (cx - cornerRadius));
  const dy = Math.max(0, Math.abs(y - cy) - (cy - cornerRadius));
  if (Math.hypot(dx, dy) > cornerRadius) {
    return [0, 0, 0, 0]; // transparent outside squircle
  }

  // Base gradient: Slate-900 to Slate-950
  const gradT = (x + y) / (w + h);
  let red = Math.round(15 + gradT * 8);
  let green = Math.round(23 + gradT * 10);
  let blue = Math.round(42 + gradT * 18);

  // Ring 1 (Gabriel - Emerald/Cyan) at (0.42*w, 0.45*h)
  const c1x = w * 0.42;
  const c1y = h * 0.46;
  const dist1 = Math.hypot(x - c1x, y - c1y);
  const ringRadius = w * 0.22;
  const ringThick = w * 0.055;
  if (Math.abs(dist1 - ringRadius) < ringThick) {
    const alpha = 1 - Math.abs(dist1 - ringRadius) / ringThick;
    red = Math.round(red * (1 - alpha) + 16 * alpha);
    green = Math.round(green * (1 - alpha) + 185 * alpha);
    blue = Math.round(blue * (1 - alpha) + 129 * alpha);
  }

  // Ring 2 (Sara - Pink/Rose) at (0.58*w, 0.54*h)
  const c2x = w * 0.58;
  const c2y = h * 0.54;
  const dist2 = Math.hypot(x - c2x, y - c2y);
  if (Math.abs(dist2 - ringRadius) < ringThick) {
    const alpha = 1 - Math.abs(dist2 - ringRadius) / ringThick;
    red = Math.round(red * (1 - alpha) + 236 * alpha);
    green = Math.round(green * (1 - alpha) + 72 * alpha);
    blue = Math.round(blue * (1 - alpha) + 153 * alpha);
  }

  // Center subtle glow
  if (r < w * 0.15) {
    const glow = (1 - r / (w * 0.15)) * 0.25;
    red = Math.round(Math.min(255, red + 255 * glow));
    green = Math.round(Math.min(255, green + 255 * glow));
    blue = Math.round(Math.min(255, blue + 255 * glow));
  }

  return [red, green, blue, 255];
}

const outDir = path.join(__dirname, 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, 'icon-192.png'), createPng(192, 192, drawIcon));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), createPng(512, 512, drawIcon));
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), createPng(180, 180, drawIcon));
console.log('Icons successfully generated!');
