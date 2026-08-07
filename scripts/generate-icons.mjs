// Regenerates the site icons from the Apologist wordmark.
//
//   node scripts/generate-icons.mjs
//
// The wordmark is far too wide to read as a favicon, so we crop the radiant
// cross off its right end and knock it out in white on an amber tile. The solid
// tile matters: Google renders favicons around 16px in search results, and iOS
// composites apple-touch-icon onto the home screen, where transparency turns
// black. Sizes here must stay in sync with `icons` in app/layout.tsx.

import sharp from "sharp";
import { writeFileSync } from "node:fs";

const SOURCE = "public/apologist.png";
const CROSS = { left: 1092, top: 340, width: 186, height: 252 };
const AMBER = "#f59e0b";
const INSET = 0.16; // padding around the cross, as a fraction of tile size

/** The cross glyph, recolored to solid white with its original alpha. */
async function whiteCross() {
  const { data, info } = await sharp(SOURCE)
    .extract(CROSS)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const px = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < info.width * info.height; i++) {
    px[i * 4] = 255;
    px[i * 4 + 1] = 255;
    px[i * 4 + 2] = 255;
    px[i * 4 + 3] = data[i * info.channels + 3];
  }
  return sharp(px, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

async function tile(cross, size) {
  // Tighter corners at favicon sizes; a 22% radius reads as a blob that small.
  const radius = Math.round(size * (size <= 32 ? 0.16 : 0.22));
  const rounded = Buffer.from(
    `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`
  );
  const inner = Math.round(size * (1 - INSET * 2));
  const glyph = await sharp(cross).resize(inner, inner, { fit: "inside" }).toBuffer();

  return sharp({ create: { width: size, height: size, channels: 4, background: AMBER } })
    .composite([
      { input: glyph, gravity: "center" },
      { input: rounded, blend: "dest-in" },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Packs PNGs into a multi-size .ico (PNG-encoded entries, supported since Vista). */
function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(entries.length, 4);

  let offset = 6 + entries.length * 16;
  const dir = [];
  for (const { size, png } of entries) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2); // palette size
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // color planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += png.length;
    dir.push(e);
  }
  return Buffer.concat([header, ...dir, ...entries.map((e) => e.png)]);
}

const cross = await whiteCross();

for (const [size, path] of [
  [512, "public/icon-512.png"],
  [192, "public/icon-192.png"],
  [180, "public/apple-touch-icon.png"],
]) {
  writeFileSync(path, await tile(cross, size));
  console.log(`wrote ${path} (${size}x${size})`);
}

const ico = buildIco(
  await Promise.all([16, 32, 48].map(async (size) => ({ size, png: await tile(cross, size) })))
);
writeFileSync("public/favicon.ico", ico);
console.log(`wrote public/favicon.ico (16/32/48, ${ico.length} bytes)`);