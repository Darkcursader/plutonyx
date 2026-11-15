// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
/**
 * strip-insignia.mjs — removes agency logos, flags and the mission nameplate from the textures of the
 * NASA "Mars 2020 Perseverance Rover" model before it is used (Space Apps rule: no NASA branding in
 * SI-assisted work). Input: the model unpacked with `gltf-transform copy` into <cache>/x/rover.
 * Each rectangle (fractions of the texture) is filled with a flat colour sampled next to it.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const DIR = (process.env.PLUTONYX_ASSETS || 'D:/PlutonyX-assets') + '/x/rover';
const JOBS = {
  // name plate "MARS 2020 PERSEVERANCE", agency logos
  'baseColor_12.webp': [{ r: [0, 0, 1, 0.69], sample: [0.02, 0.5] }], 'm_19.jpg': [{ r: [0, 0, 1, 0.69], sample: [0.02, 0.5] }],
  // JPL logo, flag, NASA insignia
  'baseColor_8.webp': [{ r: [0, 0.24, 0.19, 0.48], sample: [0.3, 0.02] }, { r: [0.85, 0.38, 1, 1], sample: [0.3, 0.02] }], 'm_11.jpg': [{ r: [0, 0.24, 0.19, 0.48], sample: [0.3, 0.02] }, { r: [0.85, 0.38, 1, 1], sample: [0.3, 0.02] }],
  // small emblem plate
  'baseColor_7.webp': [{ r: [0.72, 0.67, 0.87, 0.76], sample: [0.5, 0.6] }], 'm_9.jpg': [{ r: [0.72, 0.67, 0.87, 0.76], sample: [0.5, 0.6] }],
};
for (const [file, rects] of Object.entries(JOBS)) {
  const f = path.join(DIR, file);
  const src = fs.readFileSync(f); // read fully first: Windows cannot overwrite a file that is still open
  const { width: W, height: H } = await sharp(src).metadata();
  const raw = await sharp(src).removeAlpha().raw().toBuffer();
  const comps = rects.map(({ r, sample }) => {
    const i = (Math.floor(sample[1] * H) * W + Math.floor(sample[0] * W)) * 3;
    const w = Math.round((r[2] - r[0]) * W), h = Math.round((r[3] - r[1]) * H);
    return { input: { create: { width: w, height: h, channels: 3, background: { r: raw[i], g: raw[i + 1], b: raw[i + 2] } } }, left: Math.round(r[0] * W), top: Math.round(r[1] * H) };
  });
  const out = await sharp(raw, { raw: { width: W, height: H, channels: 3 } }).composite(comps)[file.endsWith('.webp') ? 'webp' : 'jpeg']({ quality: 92 }).toBuffer();
  fs.writeFileSync(f, out);
  console.log('patched', file, W, H);
}
