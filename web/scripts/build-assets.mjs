// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
/**
 * build-assets.mjs — turns cached source assets (D:/PlutonyX-assets, see fetch-assets.mjs) into the
 * optimised files the game ships in web/public.
 *   ground/  Poly Haven CC0 PBR ground sets → 2K WebP albedo + normal, 1K roughness, plus average colours
 *   models/  Poly Haven CC0 scanned rocks and NASA 3D Resources hardware → meshopt GLB with WebP textures
 * Usage (from web/): node scripts/build-assets.mjs [ground] [rocks] [nasa]
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = process.env.PLUTONYX_ASSETS || 'D:/PlutonyX-assets';
const want = (k) => process.argv.length <= 2 || process.argv.includes(k);
const GROUND = ['red_sand', 'red_laterite_soil_stones', 'rocky_terrain_02'];
const ROCKS = { namaqualand_boulder_02: 0.12, namaqualand_boulder_03: 0.12, namaqualand_boulder_05: 0.12, moon_rock_01: 0.2, moon_rock_03: 0.2, namaqualand_stones_01: 0.25 };

if (want('ground')) {
  const out = path.join(WEB, 'public', 'ground'); fs.mkdirSync(out, { recursive: true });
  const meta = {};
  for (const id of GROUND) {
    const src = path.join(CACHE, 'polyhaven', id);
    await sharp(path.join(src, 'diff.jpg')).resize(2048, 2048).webp({ quality: 84 }).toFile(path.join(out, `${id}_diff.webp`));
    await sharp(path.join(src, 'nor.jpg')).resize(2048, 2048).webp({ quality: 90 }).toFile(path.join(out, `${id}_nor.webp`));
    await sharp(path.join(src, 'rough.jpg')).resize(1024, 1024).greyscale().webp({ quality: 80 }).toFile(path.join(out, `${id}_rough.webp`));
    const { channels } = await sharp(path.join(src, 'diff.jpg')).stats();
    meta[id] = { avg: channels.slice(0, 3).map((c) => +(c.mean / 255).toFixed(4)), source: `https://polyhaven.com/a/${id}`, license: 'CC0' };
    console.log('ground', id, meta[id].avg.join(' '));
  }
  fs.writeFileSync(path.join(out, 'ground.json'), JSON.stringify(meta, null, 1));
}

const gt = (args) => execSync(`npx gltf-transform ${args}`, { cwd: WEB, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
if (want('rocks')) {
  const out = path.join(WEB, 'public', 'models'); fs.mkdirSync(out, { recursive: true });
  for (const [id, ratio] of Object.entries(ROCKS)) {
    const dir = path.join(CACHE, 'polyhaven', id);
    const gltf = fs.readdirSync(dir).find((f) => f.endsWith('.gltf'));
    const tmp = path.join(CACHE, 'dl', `${id}.glb`);
    gt(`simplify "${path.join(dir, gltf)}" "${tmp}" --ratio ${ratio} --error 0.01`);
    gt(`optimize "${tmp}" "${path.join(out, id + '.glb')}" --texture-compress webp --texture-size 1024 --compress meshopt --simplify false`);
    console.log('rock', id, (fs.statSync(path.join(out, id + '.glb')).size / 1048576).toFixed(2), 'MB');
  }
}
if (want('hardware')) {
  const out = path.join(WEB, 'public', 'models'); fs.mkdirSync(out, { recursive: true });
  for (const f of ['habitat', 'ascent']) {
    // meshopt only: a full "optimize" would merge our materials and drop the UVs and baked colours
    gt(`meshopt "${path.join(CACHE, 'blender_out', f + '.glb')}" "${path.join(out, f + '.glb')}"`);
    console.log('hardware', f, (fs.statSync(path.join(out, f + '.glb')).size / 1048576).toFixed(2), 'MB');
  }
}
if (want('nasa')) {
  const out = path.join(WEB, 'public', 'models'); fs.mkdirSync(out, { recursive: true });
  for (const f of (process.env.NASA_MODELS || '').split(',').filter(Boolean)) {
    gt(`optimize "${path.join(CACHE, 'nasa', f + '.glb')}" "${path.join(out, 'nasa_' + f.toLowerCase() + '.glb')}" --texture-compress webp --texture-size 2048 --compress meshopt`);
    console.log('nasa', f, (fs.statSync(path.join(out, 'nasa_' + f.toLowerCase() + '.glb')).size / 1048576).toFixed(2), 'MB');
  }
}
