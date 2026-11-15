// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
/**
 * assets.ts — loads the real, third-party assets (all listed in shared/references.md):
 *   ground/  Poly Haven CC0 PBR ground sets (red_sand, red_laterite_soil_stones, rocky_terrain_02)
 *   models/  Poly Haven CC0 scanned rocks; NASA 3D Resources "Mars 2020 Perseverance Rover"
 *            (agency logos, flag and nameplate removed from its textures by scripts/strip-insignia.mjs)
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

export const GROUND_SETS = ['red_sand', 'red_laterite_soil_stones', 'rocky_terrain_02'] as const;
export const ROCK_MODELS = ['namaqualand_boulder_02', 'namaqualand_boulder_03', 'namaqualand_boulder_05', 'moon_rock_01', 'moon_rock_03', 'namaqualand_stones_01'] as const;

export interface GroundSet { diff: THREE.Texture; nor: THREE.Texture; rough: THREE.Texture; avg: THREE.Vector3 }
export interface RockModel { geometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial; size: number }

const gltf = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const tex = new THREE.TextureLoader();

export async function loadGround(base: string, anisotropy: number): Promise<GroundSet[]> {
  const meta = await fetch(base + 'ground/ground.json').then((r) => r.json());
  return Promise.all(GROUND_SETS.map(async (id) => {
    const [diff, nor, rough] = await Promise.all(['diff', 'nor', 'rough'].map((m) => tex.loadAsync(`${base}ground/${id}_${m}.webp`)));
    diff.colorSpace = THREE.SRGBColorSpace;
    for (const t of [diff, nor, rough]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = anisotropy; }
    const a = meta[id].avg as number[];
    return { diff, nor, rough, avg: new THREE.Vector3(...a.map((c) => Math.pow(c, 2.2))) };
  }));
}

/** Each rock is re-centred on its base and scaled so its longest side is 1 unit. */
export async function loadRocks(base: string): Promise<RockModel[]> {
  const out: RockModel[] = [];
  await Promise.all(ROCK_MODELS.map(async (id) => {
    try {
      const g = await gltf.loadAsync(`${base}models/${id}.glb`);
      let mesh: THREE.Mesh | null = null;
      g.scene.updateMatrixWorld(true);
      g.scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && (!mesh || (m.geometry.attributes.position.count > mesh.geometry.attributes.position.count))) mesh = m; });
      if (!mesh) return;
      const m = mesh as THREE.Mesh;
      const geo = m.geometry.clone().applyMatrix4(m.matrixWorld);
      geo.computeBoundingBox();
      const bb = geo.boundingBox!, size = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
      const s = 1 / Math.max(size.x, size.y, size.z);
      geo.translate(-c.x, -bb.min.y, -c.z).scale(s, s, s);
      const mat = (m.material as THREE.MeshStandardMaterial).clone();
      mat.color.setRGB(0.86, 0.6, 0.45); // settle the scans into Mars dust
      mat.roughness = 1; mat.metalness = 0; mat.envMapIntensity = 0.6;
      out.push({ geometry: geo, material: mat, size: size.y * s });
    } catch (e) { console.warn('rock model missing', id, e); }
  }));
  return out;
}

/** Hero hardware built in Blender (habitat, ascent vehicle). Returns null for a model that fails to load. */
export async function loadHardware(base: string): Promise<{ habitat: THREE.Object3D | null; ascent: THREE.Object3D | null }> {
  const one = (f: string) => gltf.loadAsync(base + 'models/' + f).then((g) => g.scene as THREE.Object3D).catch((e) => { console.warn('hardware model missing', f, e); return null; });
  const [habitat, ascent] = await Promise.all([one('habitat.glb'), one('ascent.glb')]);
  return { habitat, ascent };
}

export async function loadRover(base: string): Promise<THREE.Group | null> {
  try {
    const g = await gltf.loadAsync(`${base}models/nasa_perseverance.glb`);
    g.scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; const mt = m.material as THREE.MeshStandardMaterial; if (mt.transparent) mt.depthWrite = true; } });
    return g.scene;
  } catch (e) { console.warn('rover model missing', e); return null; }
}
