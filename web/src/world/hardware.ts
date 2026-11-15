// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
/**
 * hardware.ts — materials for the hero hardware built in Blender (web/scripts/blender/build_hardware.py):
 * the habitat and the ascent vehicle. Original designs, no agency insignia.
 * The models carry baked vertex colours (R = ambient occlusion, G = edge wear, B = engine scorch). On top of
 * that, Martian dust gathers on upward-facing surfaces and on the lowest metre or two of every structure.
 * Palette (shared/style-guide.md §12): off-white, graphite, burnt orange.
 */
import * as THREE from 'three';

function noiseNormal(): THREE.CanvasTexture {
  const N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N; const c = cv.getContext('2d')!;
  c.fillStyle = '#808080'; c.fillRect(0, 0, N, N);
  for (let i = 0; i < 1400; i++) { const g = 112 + Math.random() * 34; c.fillStyle = `rgba(${g},${g},${g},0.22)`; c.beginPath(); c.ellipse(Math.random() * N, Math.random() * N, 2 + Math.random() * 14, 1 + Math.random() * 4, Math.random() * 3, 0, 7); c.fill(); }
  const h = c.getImageData(0, 0, N, N).data, out = c.createImageData(N, N);
  const H = (x: number, y: number) => h[(((y + N) % N) * N + ((x + N) % N)) * 4] / 255;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const dx = (H(x + 1, y) - H(x - 1, y)) * 1.6, dy = (H(x, y + 1) - H(x, y - 1)) * 1.6, l = Math.hypot(dx, dy, 1), i = (y * N + x) * 4; out.data[i] = (-dx / l * 0.5 + 0.5) * 255; out.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; out.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; out.data[i + 3] = 255; }
  c.putImageData(out, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); t.anisotropy = 8; return t;
}

const VERT_COMMON = 'varying vec3 vDN; varying vec3 vDP;';
const VERT_NORMAL = 'vDN = normalize(mat3(modelMatrix) * objectNormal);';
const FRAG_COMMON = [
  'varying vec3 vDN; varying vec3 vDP; uniform float uDustAmt; uniform float uBaseY; uniform float uWear; float gDustK;',
  'float wh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
  'float wn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(wh(i), wh(i+vec2(1,0)), f.x), mix(wh(i+vec2(0,1)), wh(i+vec2(1,1)), f.x), f.y); }',
].join('\n');
const FRAG_COLOR = [
  '#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )',
  '  float bAO = vColor.r, bWear = vColor.g, bScorch = vColor.b;',
  '  float grime = wn(vDP.xz * 1.7 + vDP.y * 2.3) * wn(vDP.xy * 0.45 + vDP.z);',
  '  diffuseColor.rgb *= mix(0.30, 1.0, smoothstep(0.0, 0.85, bAO));                                   // baked contact shadow',
  '  diffuseColor.rgb *= 1.0 - grime * 0.22;                                                              // uneven, used surfaces',
  '  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42, 0.42, 0.44), smoothstep(0.12, 0.7, bWear) * (0.35 + 0.5 * grime) * uWear);  // paint worn at edges',
  '  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.03, 0.026, 0.024), bScorch * 0.88);                // engine scorch',
  '#endif',
  '  float low = 1.0 - smoothstep(0.1, 2.6, vDP.y - uBaseY);',
  '  gDustK = clamp(uDustAmt * (smoothstep(0.2, 0.95, vDN.y) * (0.5 + 0.8 * wn(vDP.xz * 2.1)) + low * (0.45 + 0.55 * wn(vDP.xz * 1.3 + vDP.y * 3.0))), 0.0, 0.9);',
  '  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42, 0.235, 0.14), gDustK);',
].join('\n');

export interface HardwareMaterials { [name: string]: THREE.Material }

/** A weathered PBR material: baked occlusion and wear from vertex colours, plus live dust. */
export function weathered(p: THREE.MeshStandardMaterialParameters, dust: { value: number }, baseY: number, wear = 1): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ ...p, vertexColors: true });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uDustAmt = dust; sh.uniforms.uBaseY = { value: baseY }; sh.uniforms.uWear = { value: wear };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + VERT_COMMON)
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n' + VERT_NORMAL)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDP = (modelMatrix * vec4(position, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + FRAG_COMMON)
      .replace('#include <color_fragment>', FRAG_COLOR)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 1.0, gDustK);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor *= 1.0 - gDustK;');
  };
  return m;
}

export function hardwareMaterials(dust: { value: number }, baseY: number, glass: THREE.Material): HardwareMaterials {
  const n = noiseNormal(), ns = new THREE.Vector2(0.35, 0.35);
  return {
    hull: weathered({ color: 0xe6e1d6, roughness: 0.78, metalness: 0.04, normalMap: n, normalScale: ns }, dust, baseY),
    graphite: weathered({ color: 0x2b2d31, roughness: 0.62, metalness: 0.35, normalMap: n, normalScale: ns }, dust, baseY, 1.4),
    orange: weathered({ color: 0xc8551e, roughness: 0.72, metalness: 0.05, normalMap: n, normalScale: ns }, dust, baseY, 1.2),
    steel: weathered({ color: 0x9a9da3, roughness: 0.42, metalness: 0.85 }, dust, baseY, 0.3),
    foil: weathered({ color: 0xb98a3a, roughness: 0.38, metalness: 0.9, normalMap: n, normalScale: new THREE.Vector2(1.2, 1.2) }, dust, baseY, 0.2),
    engine: weathered({ color: 0x3a3632, roughness: 0.5, metalness: 0.9, side: THREE.DoubleSide }, dust, baseY, 0.2),
    rubber: weathered({ color: 0x17181a, roughness: 0.95, metalness: 0 }, dust, baseY, 0),
    mark: weathered({ color: 0x24262a, roughness: 0.8, metalness: 0 }, dust, baseY, 0.6),
    glass,
  };
}

/** Swap the Blender-exported placeholder materials for the weathered set and turn shadows on. */
export function dress(root: THREE.Object3D, mats: HardwareMaterials) {
  root.traverse((o) => {
    const m = o as THREE.Mesh; if (!m.isMesh) return;
    const name = (m.material as THREE.Material).name;
    const g = m.geometry; if (g.attributes.color_1) g.setAttribute('color', g.attributes.color_1); // older exports put the bake in the second colour set
    m.material = mats[name] ?? mats.hull;
    m.castShadow = name !== 'glass'; m.receiveShadow = true;
  });
}
