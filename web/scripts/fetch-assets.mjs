// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
/**
 * fetch-assets.mjs — downloads third-party source assets into a cache OUTSIDE the repo (D:/PlutonyX-assets).
 * Only optimised copies are later written into web/public by build-assets.mjs.
 *   Poly Haven (https://polyhaven.com) — CC0 PBR ground textures and scanned rocks
 *   NASA 3D Resources (https://github.com/nasa/NASA-3D-Resources) — hardware models
 * Usage: node scripts/fetch-assets.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const CACHE = process.env.PLUTONYX_ASSETS || 'D:/PlutonyX-assets';
const UA = { 'User-Agent': 'student-hackathon-game/1.0' };
const TEXTURES = ['red_sand', 'red_laterite_soil_stones', 'rocky_terrain_02', 'cracked_red_ground'];
const MODELS = ['namaqualand_boulder_02', 'namaqualand_boulder_03', 'namaqualand_boulder_05', 'moon_rock_01', 'moon_rock_03', 'moon_rock_05', 'namaqualand_stones_01', 'sand_rocks_small_01'];
const NASA = ['Mars 2020 Perseverance Rover/Mars 2020 Perseverance Rover.glb', 'Habitat Demonstration Unit/Habitat Demonstration Unit (part 1).glb', 'Habitat Demonstration Unit/Habitat Demonstration Unit (part 2).glb', 'Tall Dish/Tall Dish (dish).glb', 'Tall Dish/Tall Dish (post).glb', 'Tall Dish/Tall Dish (turntable).glb', 'Ingenuity Mars Helicopter/Ingenuity Mars Helicopter.glb', 'Mark III Spacesuit/Mark III Spacesuit.glb'];

async function dl(url, file) {
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(180000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
      console.log('  ok', path.relative(CACHE, file), (fs.statSync(file).size / 1048576).toFixed(2), 'MB');
      return;
    } catch (e) { console.warn('  retry', url, e.message); }
  }
  console.warn('  FAILED', url);
}

for (const id of TEXTURES) {
  console.log('texture', id);
  const f = await (await fetch(`https://api.polyhaven.com/files/${id}`, { headers: UA })).json();
  for (const [map, key] of [['diff', 'Diffuse'], ['nor', 'nor_gl'], ['rough', 'Rough'], ['ao', 'AO'], ['disp', 'Displacement']]) {
    const u = f[key]?.['2k']?.jpg?.url;
    if (u) await dl(u, path.join(CACHE, 'polyhaven', id, `${map}.jpg`));
  }
}
for (const id of MODELS) {
  console.log('model', id);
  const f = await (await fetch(`https://api.polyhaven.com/files/${id}`, { headers: UA })).json();
  const g = f.gltf?.['1k']?.gltf;
  if (!g) { console.warn('  no gltf'); continue; }
  const dir = path.join(CACHE, 'polyhaven', id);
  await dl(g.url, path.join(dir, path.basename(g.url)));
  for (const [rel, inc] of Object.entries(g.include || {})) await dl(inc.url, path.join(dir, rel));
}
for (const p of NASA) {
  console.log('nasa', p);
  await dl('https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/' + p.split('/').map(encodeURIComponent).join('/'), path.join(CACHE, 'nasa', path.basename(p).replace(/[ ()]+/g, '_')));
}
console.log('done');
