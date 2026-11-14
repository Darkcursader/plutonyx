// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
/**
 * build-terrain.mjs — turns the REAL Jezero Crater elevation model and image mosaic into game textures.
 *
 * Input (downloaded once into <repo>/.cache/terrain/, never committed):
 *   JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif   elevation, 20 m/pixel
 *   JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0.tif                      image, 6 m/pixel
 *   Source: USGS Astrogeology for NASA Mars 2020 (Mars Reconnaissance Orbiter CTX camera, NASA/JPL/MSSS)
 *   https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/
 *
 * Output:
 *   web/public/terrain/height.png      elevation packed in two 8-bit channels (R = high byte, G = low byte)
 *   web/public/terrain/normal.png      surface normals computed from the elevation (true scale)
 *   web/public/terrain/albedo.webp     the real orbital image (greyscale)
 *   shared/data/terrain/jezero.json    georeferencing + height range (both editions)
 *   shared/data/terrain/jezero_height_16bit.png   same elevation as 16-bit greyscale for Unity
 *
 * Usage (from web/):  node scripts/build-terrain.mjs [--preview]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fromFile } from 'geotiff';
import sharp from 'sharp';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const CACHE = path.join(REPO, '.cache', 'terrain');
const DTM = path.join(CACHE, 'JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif');
const ORTHO = path.join(CACHE, 'JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0.tif');
const OUT_WEB = path.join(REPO, 'web', 'public', 'terrain');
const OUT_SHARED = path.join(REPO, 'shared', 'data', 'terrain');

// --- the crop: a square of real Mars, centred between the delta front and the Perseverance landing site
const MARS_RADIUS = 3396190; // metres, the sphere used by this map projection
const CENTER = { lat: Number(process.env.T_LAT ?? 18.47), lon: Number(process.env.T_LON ?? 77.40) };
const SIZE_M = Number(process.env.T_SIZE ?? 20480); // map metres per side
const HEIGHT_PX = 1024; // elevation samples per side (20 m each)
const NORMAL_PX = 2048;
const ALBEDO_PX = 4096;
const OUTPOST = { lat: 18.4447, lon: 77.4508, name: 'near the Perseverance landing site (Octavia E. Butler Landing)' };

const toMap = (lat, lon) => ({ x: (MARS_RADIUS * lon * Math.PI) / 180, y: (MARS_RADIUS * lat * Math.PI) / 180 });

async function open(file) {
  const tiff = await fromFile(file);
  const img = await tiff.getImage();
  const [ox, oy] = img.getOrigin();
  const [rx, ry] = img.getResolution();
  return { img, w: img.getWidth(), h: img.getHeight(), ox, oy, rx, ry: Math.abs(ry), nodata: img.getGDALNoData() };
}
const windowFor = (t, cx, cy, size) => {
  const x0 = Math.round((cx - size / 2 - t.ox) / t.rx);
  const y0 = Math.round((t.oy - (cy + size / 2)) / t.ry);
  const n = Math.round(size / t.rx);
  return [x0, y0, x0 + n, y0 + n];
};

const dtm = await open(DTM);
const ortho = await open(ORTHO);
const lonAt = (x) => (x / MARS_RADIUS) * (180 / Math.PI);
console.log('DTM  ', dtm.w, 'x', dtm.h, 'res', dtm.rx, 'lon', lonAt(dtm.ox).toFixed(3), '..', lonAt(dtm.ox + dtm.w * dtm.rx).toFixed(3), 'lat', lonAt(dtm.oy - dtm.h * dtm.ry).toFixed(3), '..', lonAt(dtm.oy).toFixed(3), 'nodata', dtm.nodata);
console.log('ORTHO', ortho.w, 'x', ortho.h, 'res', ortho.rx, 'lon', lonAt(ortho.ox).toFixed(3), '..', lonAt(ortho.ox + ortho.w * ortho.rx).toFixed(3), 'lat', lonAt(ortho.oy - ortho.h * ortho.ry).toFixed(3), '..', lonAt(ortho.oy).toFixed(3));

if (process.argv.includes('--preview')) {
  // whole-mosaic hillshade so a human can choose the crop
  const P = 1000;
  const [d] = await dtm.img.readRasters({ width: P, height: Math.round((P * dtm.h) / dtm.w), resampleMethod: 'bilinear' });
  const ph = Math.round((P * dtm.h) / dtm.w);
  const px = (dtm.w * dtm.rx) / P;
  const out = Buffer.alloc(P * ph * 3);
  let lo = Infinity, hi = -Infinity;
  for (const v of d) if (v !== dtm.nodata && v > -1e5) { if (v < lo) lo = v; if (v > hi) hi = v; }
  for (let y = 0; y < ph; y++) for (let x = 0; x < P; x++) {
    const g = (xx, yy) => { const v = d[Math.min(ph - 1, Math.max(0, yy)) * P + Math.min(P - 1, Math.max(0, xx))]; return v === dtm.nodata || v < -1e5 ? lo : v; };
    const dzdx = (g(x + 1, y) - g(x - 1, y)) / (2 * px), dzdy = (g(x, y + 1) - g(x, y - 1)) / (2 * px);
    const shade = Math.max(0, Math.min(1, 0.55 + (-dzdx * 3 + dzdy * 3)));
    const t = (g(x, y) - lo) / (hi - lo);
    const i = (y * P + x) * 3;
    out[i] = 255 * shade * (0.5 + 0.5 * t); out[i + 1] = 255 * shade * (0.45 + 0.4 * t); out[i + 2] = 255 * shade * (0.4 + 0.3 * t);
  }
  // mark the crop square and the outpost
  const c = toMap(CENTER.lat, CENTER.lon), o = toMap(OUTPOST.lat, OUTPOST.lon);
  const mark = (mx, my, r, col) => { const X = Math.round((mx - dtm.ox) / px), Y = Math.round((dtm.oy - my) / px); for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) { if (Math.max(Math.abs(xx), Math.abs(yy)) < r - 1) continue; const xi = X + xx, yi = Y + yy; if (xi < 0 || yi < 0 || xi >= P || yi >= ph) continue; out.set(col, (yi * P + xi) * 3); } };
  mark(c.x, c.y, Math.round(SIZE_M / 2 / px), [0, 255, 255]);
  mark(o.x, o.y, 5, [255, 255, 0]);
  fs.mkdirSync(CACHE, { recursive: true });
  await sharp(out, { raw: { width: P, height: ph, channels: 3 } }).png().toFile(path.join(CACHE, 'preview.png'));
  console.log('elevation range', lo.toFixed(0), hi.toFixed(0), '→ .cache/terrain/preview.png');
  process.exit(0);
}

fs.mkdirSync(OUT_WEB, { recursive: true });
fs.mkdirSync(OUT_SHARED, { recursive: true });
const c = toMap(CENTER.lat, CENTER.lon);

// ---- elevation
const hw = windowFor(dtm, c.x, c.y, SIZE_M);
const [raw] = await dtm.img.readRasters({ window: hw, width: HEIGHT_PX, height: HEIGHT_PX, resampleMethod: 'bilinear', fillValue: dtm.nodata ?? -32768 });
let lo = Infinity, hi = -Infinity;
for (const v of raw) if (v !== dtm.nodata && v > -1e5) { if (v < lo) lo = v; if (v > hi) hi = v; }
const H = new Float32Array(HEIGHT_PX * HEIGHT_PX);
for (let i = 0; i < H.length; i++) H[i] = raw[i] === dtm.nodata || raw[i] < -1e5 ? lo : raw[i];
const u16 = new Uint16Array(H.length);
const packed = Buffer.alloc(H.length * 3);
for (let i = 0; i < H.length; i++) {
  const q = Math.round(((H[i] - lo) / (hi - lo)) * 65535);
  u16[i] = q; packed[i * 3] = q >> 8; packed[i * 3 + 1] = q & 255;
}
await sharp(packed, { raw: { width: HEIGHT_PX, height: HEIGHT_PX, channels: 3 } }).png({ compressionLevel: 9 }).toFile(path.join(OUT_WEB, 'height.png'));
await sharp(Buffer.from(u16.buffer), { raw: { width: HEIGHT_PX, height: HEIGHT_PX, channels: 1, depth: 'ushort' } }).png({ compressionLevel: 9 }).toFile(path.join(OUT_SHARED, 'jezero_height_16bit.png'));

// ---- normals at 2× the elevation grid (bicubic upsample, true scale; x is squeezed by cos(latitude))
const cosLat = Math.cos((CENTER.lat * Math.PI) / 180);
const up = new Float32Array(await sharp(Buffer.from(u16.buffer), { raw: { width: HEIGHT_PX, height: HEIGHT_PX, channels: 1, depth: 'ushort' } })
  .resize(NORMAL_PX, NORMAL_PX, { kernel: 'cubic' }).raw({ depth: 'float' }).toBuffer().then((b) => new Float32Array(b.buffer, b.byteOffset, b.length / 4)));
const scaleH = (hi - lo) / 65535;
const cell = SIZE_M / NORMAL_PX;
const nbuf = Buffer.alloc(NORMAL_PX * NORMAL_PX * 3);
const at = (x, y) => up[Math.min(NORMAL_PX - 1, Math.max(0, y)) * NORMAL_PX + Math.min(NORMAL_PX - 1, Math.max(0, x))] * scaleH;
for (let y = 0; y < NORMAL_PX; y++) for (let x = 0; x < NORMAL_PX; x++) {
  const dx = (at(x + 1, y) - at(x - 1, y)) / (2 * cell * cosLat);
  const dy = (at(x, y + 1) - at(x, y - 1)) / (2 * cell);
  const inv = 1 / Math.hypot(dx, dy, 1);
  const i = (y * NORMAL_PX + x) * 3;
  nbuf[i] = Math.round((-dx * inv * 0.5 + 0.5) * 255);      // +X east
  nbuf[i + 1] = Math.round((1 * inv * 0.5 + 0.5) * 255);    // +Y up
  nbuf[i + 2] = Math.round((-dy * inv * 0.5 + 0.5) * 255);  // +Z south (image y grows southward)
}
await sharp(nbuf, { raw: { width: NORMAL_PX, height: NORMAL_PX, channels: 3 } }).png({ compressionLevel: 9 }).toFile(path.join(OUT_WEB, 'normal.png'));

// ---- the real image
const ow = windowFor(ortho, c.x, c.y, SIZE_M);
const [oraw] = await ortho.img.readRasters({ window: ow, fillValue: 0 });
const on = ow[2] - ow[0];
const bits = ortho.img.getBitsPerSample()[0] ?? 8;
let omin = Infinity, omax = -Infinity;
for (let i = 0; i < oraw.length; i += 7) { const v = oraw[i]; if (v > 0) { if (v < omin) omin = v; if (v > omax) omax = v; } }
const o8 = Buffer.alloc(oraw.length);
for (let i = 0; i < oraw.length; i++) o8[i] = oraw[i] <= 0 ? 0 : Math.max(1, Math.min(255, Math.round(((oraw[i] - omin) / (omax - omin)) * 255)));
await sharp(o8, { raw: { width: on, height: on, channels: 1 }, limitInputPixels: false }).resize(ALBEDO_PX, ALBEDO_PX, { kernel: 'lanczos3' }).webp({ quality: 90 }).toFile(path.join(OUT_WEB, 'albedo.webp'));

// ---- where things are
const o = toMap(OUTPOST.lat, OUTPOST.lon);
const meta = {
  _comment: 'Real terrain of Jezero Crater, Mars. Generated by web/scripts/build-terrain.mjs. One file for both editions.',
  site: 'Jezero Crater, Mars',
  source: {
    elevation: 'Mars 2020 Terrain Relative Navigation CTX DTM mosaic, 20 m/pixel (USGS Astrogeology for NASA Mars 2020; MRO Context Camera: NASA/JPL/MSSS)',
    image: 'Mars 2020 Terrain Relative Navigation CTX orthomosaic, 6 m/pixel (same)',
    urls: ['https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif', 'https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0.tif'],
    caption: 'This is the real terrain of Jezero Crater, from NASA Mars Reconnaissance Orbiter (CTX camera) data.',
  },
  projection: 'Equirectangular, sphere radius 3396190 m, standard parallel 0 (map x is stretched east-west; multiply by cosLat for true metres)',
  center: CENTER,
  mapSizeMetres: SIZE_M,
  groundSizeMetres: { eastWest: Math.round(SIZE_M * cosLat), northSouth: SIZE_M },
  cosLat,
  heightSamples: HEIGHT_PX,
  elevationMetres: { min: lo, max: hi, note: 'height.png value 0..65535 maps linearly to min..max (metres relative to the Mars areoid). Vertical scale in the game is 1:1.' },
  outpost: { ...OUTPOST, u: (o.x - (c.x - SIZE_M / 2)) / SIZE_M, v: (c.y + SIZE_M / 2 - o.y) / SIZE_M, note: 'u,v = fraction across the square from the west and from the north edge' },
  simplifications: ['The image is greyscale; the game tints it with Mars colours.', 'Detail smaller than 20 m (rocks, ripples) is procedural, not data.'],
};
fs.writeFileSync(path.join(OUT_SHARED, 'jezero.json'), JSON.stringify(meta, null, 1));
fs.copyFileSync(path.join(OUT_SHARED, 'jezero.json'), path.join(OUT_WEB, 'jezero.json'));
console.log('elevation', lo.toFixed(1), '..', hi.toFixed(1), 'm · ortho', on, 'px', bits, 'bit', omin, omax, '· outpost uv', meta.outpost.u.toFixed(3), meta.outpost.v.toFixed(3));
for (const f of fs.readdirSync(OUT_WEB)) console.log(' ', f, (fs.statSync(path.join(OUT_WEB, f)).size / 1048576).toFixed(2), 'MB');
