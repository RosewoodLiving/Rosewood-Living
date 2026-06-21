import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const logos = path.join(root, "public", "media", "logos");

const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

/**
 * Luminance-key a flat-background line-art render into a clean transparent PNG.
 * mode "dark"  => dark lines on light bg  (alpha grows as pixel darkens)
 * mode "light" => light lines on dark bg  (alpha grows as pixel brightens)
 * Output RGB is forced to a single brand colour; alpha carries the anti-aliasing.
 */
async function key({ input, output, mode, color }) {
  const img = sharp(input).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  // Reference luminances.
  const bgL = mode === "dark" ? 255 : lum(0x14, 0x10, 0x0c);
  const lineL = mode === "dark" ? lum(0x3a, 0x1e, 0x16) : lum(0xf4, 0xef, 0xe6);
  const span = Math.abs(lineL - bgL) || 1;

  const out = Buffer.alloc(width * height * 4);
  for (let i = 0, o = 0; i < data.length; i += channels, o += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const L = lum(r, g, b);
    let a = mode === "dark" ? (bgL - L) / span : (L - bgL) / span;
    a = clamp01(a);
    // Slight contrast curve to keep the lines crisp and a touch bolder.
    a = clamp01((a - 0.06) / 0.9);
    out[o] = color[0];
    out[o + 1] = color[1];
    out[o + 2] = color[2];
    out[o + 3] = Math.round(a * 255);
  }

  await sharp(out, { raw: { width, height, channels: 4 } })
    .png()
    .trim({ threshold: 1 })
    .extend({
      top: 40, bottom: 40, left: 40, right: 40,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(output);

  const meta = await sharp(output).metadata();
  console.log(`${path.basename(output)} -> ${meta.width}x${meta.height}`);
}

async function favicon({ crest, output, size = 128 }) {
  const tile = path.join(logos, "_tmp_tile.png");
  // Brand ivory rounded tile so the mark is visible on both light & dark chrome.
  const pad = Math.round(size * 0.16);
  const inner = size - pad * 2;
  const mark = await sharp(crest)
    .resize({ width: inner, height: inner, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const radius = Math.round(size * 0.22);
  const roundedMask = Buffer.from(
    `<svg width="${size}" height="${size}"><rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}"/></svg>`,
  );
  await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0xec, g: 0xe6, b: 0xda, alpha: 1 } },
  })
    .composite([
      { input: mark, top: pad, left: pad },
      { input: roundedMask, blend: "dest-in" },
    ])
    .png()
    .toFile(output);
  console.log(`${path.basename(output)} -> ${size}x${size}`);
  void tile;
}

await key({
  input: path.join(logos, "crest-dark-raw.png"),
  output: path.join(logos, "crest-dark.png"),
  mode: "dark",
  color: [0x3a, 0x1e, 0x16],
});
await key({
  input: path.join(logos, "crest-light-raw.png"),
  output: path.join(logos, "crest-light.png"),
  mode: "light",
  color: [0xf4, 0xef, 0xe6],
});
await favicon({
  crest: path.join(logos, "crest-dark.png"),
  output: path.join(root, "public", "favicon.png"),
  size: 128,
});

console.log("done");
