// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
/**
 * outpost.ts — Lakeshore Outpost, built procedurally (no external models, no logos or insignia).
 * Layout follows shared/style-guide.md §8. Everything the simulation changes is visible here:
 * window light = power, magenta glow + plant size = greenhouse, violet dome = shield charge,
 * vent plume = Air Maker, rover on its pad = Dil is home, dusty panels = less sunlight.
 */
import * as THREE from 'three';

export interface OutpostState {
  power: number; shield: number; plants: number; plantsDead: boolean;
  life: number; garden: number; shieldLevel: number; rover: number;
  roverHome: boolean; storm: number; dust: number; panelsDusty: boolean; night: number; frost: boolean;
}

type GroundFn = (x: number, z: number) => number;

function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, repeat?: [number, number]): THREE.CanvasTexture {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

const hullTex = (rep: [number, number]) => canvasTex(512, 512, (c) => {
  c.fillStyle = '#d9d4c8'; c.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(${90 + Math.random() * 60},${60 + Math.random() * 40},${40 + Math.random() * 30},${Math.random() * 0.05})`; c.fillRect(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 5, 1 + Math.random() * 3); }
  c.strokeStyle = 'rgba(40,36,32,0.55)'; c.lineWidth = 2;
  for (let y = 0; y <= 512; y += 128) { c.beginPath(); c.moveTo(0, y); c.lineTo(512, y); c.stroke(); }
  for (let y = 0; y < 512; y += 128) for (let x = (y / 128) % 2 ? 64 : 0; x <= 512; x += 128) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 128); c.stroke(); }
  c.fillStyle = 'rgba(30,28,26,0.6)';
  for (let y = 10; y < 512; y += 128) for (let x = 10; x < 512; x += 32) { c.beginPath(); c.arc(x, y, 1.6, 0, 7); c.fill(); }
  const g = c.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(120,70,40,0.32)');
  c.fillStyle = g; c.fillRect(0, 0, 512, 512);
}, rep);

/** Tangent-space normal map generated from a drawn height field (panel seams, bolts, fabric wrinkles). */
const hullNormal = (rep: [number, number]) => {
  const N = 512, cv = document.createElement('canvas'); cv.width = cv.height = N; const c = cv.getContext('2d')!;
  c.fillStyle = '#808080'; c.fillRect(0, 0, N, N);
  for (let i = 0; i < 900; i++) { const g = 118 + Math.random() * 22; c.fillStyle = 'rgba(' + g + ',' + g + ',' + g + ',0.25)'; c.beginPath(); c.ellipse(Math.random() * N, Math.random() * N, 6 + Math.random() * 30, 2 + Math.random() * 6, Math.random() * 3, 0, 7); c.fill(); }
  c.strokeStyle = '#303030'; c.lineWidth = 3;
  for (let y = 0; y <= N; y += 128) { c.beginPath(); c.moveTo(0, y); c.lineTo(N, y); c.stroke(); }
  for (let y = 0; y < N; y += 128) for (let x = (y / 128) % 2 ? 64 : 0; x <= N; x += 128) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 128); c.stroke(); }
  c.fillStyle = '#d8d8d8'; for (let y = 10; y < N; y += 128) for (let x = 10; x < N; x += 32) { c.beginPath(); c.arc(x, y, 2.4, 0, 7); c.fill(); }
  const h = c.getImageData(0, 0, N, N).data, out = c.createImageData(N, N);
  const H = (x: number, y: number) => h[(((y + N) % N) * N + ((x + N) % N)) * 4] / 255;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const dx = (H(x + 1, y) - H(x - 1, y)) * 2.2, dy = (H(x, y + 1) - H(x, y - 1)) * 2.2, l = Math.hypot(dx, dy, 1), i = (y * N + x) * 4; out.data[i] = (-dx / l * 0.5 + 0.5) * 255; out.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; out.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; out.data[i + 3] = 255; }
  c.putImageData(out, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.anisotropy = 8; return t;
};

const DUST_VERT_COMMON = 'varying vec3 vDN; varying vec3 vDP;';
const DUST_VERT_NORMAL = [
  '#ifdef USE_INSTANCING',
  'vDN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);',
  '#else',
  'vDN = normalize(mat3(modelMatrix) * objectNormal);',
  '#endif',
].join('\n');
const DUST_FRAG_COMMON = [
  'varying vec3 vDN; varying vec3 vDP; uniform float uDustAmt; float gDustK;',
  'float dh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
  'float dn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(dh(i), dh(i+vec2(1,0)), f.x), mix(dh(i+vec2(0,1)), dh(i+vec2(1,1)), f.x), f.y); }',
].join('\n');
const DUST_FRAG_MAP = [
  'gDustK = clamp(uDustAmt * smoothstep(0.25, 0.95, vDN.y) * (0.55 + 0.75 * dn(vDP.xz * 2.3 + vDP.y) * dn(vDP.xz * 0.6)), 0.0, 0.92);',
  'diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.40, 0.22, 0.13), gDustK);',
].join('\n');

/**
 * Dust accumulation: Martian dust settles on surfaces that face the sky. The amount is shared so gameplay can
 * change it (after a dust storm the solar panels are visibly dusty and make less power until they are cleaned).
 */
function dustify<T extends THREE.MeshStandardMaterial>(mat: T, amount: { value: number }): T {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uDustAmt = amount;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + DUST_VERT_COMMON)
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n' + DUST_VERT_NORMAL)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDP = (modelMatrix * vec4(position, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + DUST_FRAG_COMMON)
      .replace('#include <map_fragment>', '#include <map_fragment>\n' + DUST_FRAG_MAP)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 1.0, gDustK);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor *= 1.0 - gDustK;');
  };
  return mat;
}

const solarTex = () => canvasTex(512, 256, (c) => {
  c.fillStyle = '#0a1230'; c.fillRect(0, 0, 512, 256);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 8; x++) {
    const g = c.createLinearGradient(x * 64, y * 64, x * 64 + 64, y * 64 + 64);
    g.addColorStop(0, '#16245c'); g.addColorStop(1, '#0b1438');
    c.fillStyle = g; c.fillRect(x * 64 + 2, y * 64 + 2, 60, 60);
    c.strokeStyle = 'rgba(190,200,230,0.35)'; c.lineWidth = 1;
    for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(x * 64 + 2, y * 64 + k * 16); c.lineTo(x * 64 + 62, y * 64 + k * 16); c.stroke(); }
    c.beginPath(); c.moveTo(x * 64 + 32, y * 64 + 2); c.lineTo(x * 64 + 32, y * 64 + 62); c.stroke();
  }
});

export class Outpost {
  group = new THREE.Group();
  focus: Record<string, THREE.Vector3> = {};
  private windows: THREE.MeshStandardMaterial;
  private led: THREE.MeshStandardMaterial;
  private growLight: THREE.PointLight;
  private habLight: THREE.PointLight;
  private plants: THREE.InstancedMesh;
  private plantSeeds: { x: number; y: number; z: number; s: number; r: number }[] = [];
  private dome: THREE.Mesh;
  private domeU = { uCharge: { value: 0 }, uStorm: { value: 0 }, uTime: { value: 0 } };
  private pylonTops: THREE.MeshStandardMaterial;
  private panelMat: THREE.MeshStandardMaterial;
  private plume: THREE.Points;
  private plumeU = { uTime: { value: 0 }, uLevel: { value: 0.5 } };
  private dish = new THREE.Group();
  private dishLamp: THREE.MeshStandardMaterial;
  private rover = new THREE.Group();
  fieldRover = new THREE.Group();
  ship = new THREE.Group();
  private shipFlame: THREE.Mesh;
  private bollards: THREE.MeshStandardMaterial;
  private frostMat: THREE.MeshStandardMaterial[] = [];
  private state: OutpostState | null = null;
  private dustHull = { value: 0.28 }; private dustPanels = { value: 0.12 };
  private launchDust!: THREE.Points; private launchU = { uT: { value: -1 } };
  private dummy = new THREE.Object3D();

  constructor(private ground: GroundFn) {
    const hull = dustify(new THREE.MeshStandardMaterial({ map: hullTex([3, 1]), normalMap: hullNormal([3, 1]), normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.7, metalness: 0.1 }), this.dustHull);
    const hull2 = dustify(new THREE.MeshStandardMaterial({ map: hullTex([2, 2]), normalMap: hullNormal([2, 2]), normalScale: new THREE.Vector2(0.7, 0.7), roughness: 0.78, metalness: 0.05, color: 0xe9e2d4 }), this.dustHull);
    const dark = dustify(new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.55, metalness: 0.6 }), this.dustHull);
    const steel = new THREE.MeshStandardMaterial({ color: 0x8c9198, roughness: 0.38, metalness: 0.85 });
    const foil = new THREE.MeshStandardMaterial({ color: 0xc79a3a, roughness: 0.35, metalness: 0.9 });
    const rust = new THREE.MeshStandardMaterial({ color: 0x7a4a30, roughness: 1 });
    this.windows = new THREE.MeshStandardMaterial({ color: 0x1a1612, emissive: 0xffd9a0, emissiveIntensity: 1.5, roughness: 0.2 });
    this.led = new THREE.MeshStandardMaterial({ color: 0x220018, emissive: 0xe05ad0, emissiveIntensity: 2.2 });
    this.bollards = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x9fe8ff, emissiveIntensity: 0 });
    this.pylonTops = new THREE.MeshStandardMaterial({ color: 0x140f24, emissive: 0x9f8cff, emissiveIntensity: 0.2 });
    this.dishLamp = new THREE.MeshStandardMaterial({ color: 0x101010, emissive: 0x5cc8f0, emissiveIntensity: 0 });
    this.frostMat = [hull, hull2];

    const at = (o: THREE.Object3D, x: number, z: number, y = 0) => { o.position.set(x, this.ground(x, z) + y, z); this.group.add(o); return o; };
    const M = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0, cast = true) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = cast; o.receiveShadow = true; return o; };
    const cyl = (r1: number, r2: number, h: number, seg = 32) => new THREE.CylinderGeometry(r1, r2, h, seg);

    // ---------------- core habitat: two-storey drum on legs
    const hab = new THREE.Group();
    hab.add(M(cyl(5.4, 5.4, 6.4, 64), hull, 0, 4.9, 0));
    hab.add(M(new THREE.SphereGeometry(5.4, 64, 16, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.32, 1), hull2, 0, 8.1, 0));
    hab.add(M(cyl(5.2, 4.4, 0.7, 64), dark, 0, 1.4, 0));
    for (const y of [1.85, 5.0, 8.05]) hab.add(M(new THREE.TorusGeometry(5.46, 0.14, 10, 80).rotateX(Math.PI / 2), steel, 0, y, 0));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.39;
      const leg = M(cyl(0.16, 0.2, 2.3, 10), steel, Math.cos(a) * 4.6, 0.75, Math.sin(a) * 4.6); leg.rotation.z = Math.cos(a) * 0.2; leg.rotation.x = -Math.sin(a) * 0.2; hab.add(leg);
      hab.add(M(cyl(0.5, 0.6, 0.12, 14), dark, Math.cos(a) * 4.85, 0.06, Math.sin(a) * 4.85));
    }
    for (let f = 0; f < 2; f++) for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + f * 0.26;
      if (f === 0 && Math.abs(Math.sin(a) - 1) < 0.2) continue; // airlock side
      const w = M(new THREE.BoxGeometry(0.95, 0.72, 0.16), this.windows, Math.cos(a) * 5.38, 3.45 + f * 3.0, Math.sin(a) * 5.38, false); w.rotation.y = -a + Math.PI / 2; hab.add(w);
      const fr = M(new THREE.BoxGeometry(1.15, 0.92, 0.1), dark, Math.cos(a) * 5.36, 3.45 + f * 3.0, Math.sin(a) * 5.36, false); fr.rotation.y = -a + Math.PI / 2; hab.add(fr);
    }
    // airlock (south), steps, hatch
    hab.add(M(new THREE.BoxGeometry(2.6, 2.7, 3.2), hull2, 0, 2.95, 6.3));
    hab.add(M(cyl(0.85, 0.85, 0.16, 28).rotateX(Math.PI / 2), dark, 0, 2.95, 7.95));
    hab.add(M(cyl(0.3, 0.3, 0.18, 20).rotateX(Math.PI / 2), this.windows, 0, 3.2, 7.98, false));
    for (let i = 0; i < 6; i++) hab.add(M(new THREE.BoxGeometry(1.8, 0.07, 0.34), steel, 0, 1.55 - i * 0.27, 8.3 + i * 0.36));
    for (const sx of [-0.92, 0.92]) { const rail = M(cyl(0.03, 0.03, 2.9, 6), steel, sx, 1.45, 9.2); rail.rotation.x = -0.64; hab.add(rail); }
    // roof: mast, small dish, tanks, radiator fins
    hab.add(M(cyl(0.07, 0.1, 5.5, 8), steel, 1.8, 11.4, -1.2));
    hab.add(M(new THREE.SphereGeometry(0.16, 10, 8), this.dishLamp, 1.8, 14.2, -1.2, false));
    for (let i = 0; i < 4; i++) { const fin = M(new THREE.BoxGeometry(2.6, 1.5, 0.06), new THREE.MeshStandardMaterial({ color: 0xe8ecef, roughness: 0.3, metalness: 0.5 }), -2.2 + i * 0.5, 9.9, 1.2); fin.rotation.x = -0.25; hab.add(fin); }
    for (const a of [2.3, 2.9, 3.5]) hab.add(M(new THREE.CapsuleGeometry(0.55, 1.6, 6, 16), foil, Math.cos(a) * 6.3, 2.6, Math.sin(a) * 6.3));
    // lab module (east) with tunnel
    const lab = M(new THREE.CapsuleGeometry(2.3, 7.5, 10, 40).rotateZ(Math.PI / 2), hull, 12.5, 3.3, -1.0); hab.add(lab);
    hab.add(M(cyl(1.25, 1.25, 3.4, 24).rotateZ(Math.PI / 2), hull2, 6.6, 3.3, -1.0));
    for (const x of [9.6, 12.5, 15.4]) hab.add(M(new THREE.TorusGeometry(2.34, 0.1, 8, 48).rotateY(Math.PI / 2), steel, x, 3.3, -1.0));
    for (const x of [10.2, 12.5, 14.8]) { hab.add(M(new THREE.BoxGeometry(0.9, 0.6, 0.14), this.windows, x, 3.9, 1.24, false)); hab.add(M(cyl(0.14, 0.18, 1.3, 8), steel, x, 0.65, 0.4)); hab.add(M(cyl(0.14, 0.18, 1.3, 8), steel, x, 0.65, -2.4)); }
    at(hab, 0, -38);
    this.habLight = new THREE.PointLight(0xffd9a0, 0, 60, 1.6); this.habLight.position.set(0, 5, 9); hab.add(this.habLight);
    this.focus.outpost = hab.position.clone().add(new THREE.Vector3(0, 5, 0));
    this.focus.interior = hab.position.clone().add(new THREE.Vector3(0, 4.5, 4));

    // ---------------- greenhouse: clear half-cylinder with ribs, racks, plants, magenta LEDs
    const gh = new THREE.Group();
    const L = 16, R = 4.4;
    const skin = new THREE.MeshPhysicalMaterial({ color: 0xcfe8f5, transparent: true, opacity: 0.22, roughness: 0.08, metalness: 0, side: THREE.DoubleSide, depthWrite: false, clearcoat: 1 });
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(R, R, L, 48, 1, true, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2).rotateY(Math.PI / 2), skin);
    shell.renderOrder = 5; gh.add(shell);
    for (let i = 0; i <= 8; i++) { const rib = M(new THREE.TorusGeometry(R + 0.03, 0.09, 8, 40, Math.PI).rotateY(Math.PI / 2), steel, -L / 2 + (i * L) / 8, 0, 0); gh.add(rib); }
    for (const a of [0.5, Math.PI / 2, Math.PI - 0.5]) gh.add(M(cyl(0.05, 0.05, L, 6).rotateZ(Math.PI / 2), steel, 0, Math.sin(a) * R, Math.cos(a) * R));
    gh.add(M(new THREE.BoxGeometry(L, 0.3, R * 2 + 0.4), dark, 0, 0.05, 0));
    for (const sx of [-1, 1]) { const cap = new THREE.Mesh(new THREE.CircleGeometry(R, 40, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0xd8d2c6, roughness: 0.7, side: THREE.DoubleSide })); cap.rotation.y = Math.PI / 2; cap.position.x = (sx * L) / 2; gh.add(cap); }
    for (const z of [-2.2, 0, 2.2]) {
      gh.add(M(new THREE.BoxGeometry(L - 2, 0.45, 1.2), new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 0.9 }), 0, 0.55, z));
      gh.add(M(new THREE.BoxGeometry(L - 2, 0.06, 0.35), this.led, 0, Math.sqrt(R * R - z * z) - 0.55, z, false));
    }
    const leaf = new THREE.MeshStandardMaterial({ color: 0x3f9a4a, roughness: 0.7, emissive: 0x0c2a10, emissiveIntensity: 0.6 });
    this.plants = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.34, 1), leaf, 180);
    let pi = 0;
    for (const z of [-2.2, 0, 2.2]) for (let k = 0; k < 60; k++) this.plantSeeds[pi++] = { x: -L / 2 + 1.3 + (k % 30) * ((L - 2.6) / 29), y: 0.82, z: z + (k < 30 ? -0.28 : 0.28), s: 0.6 + Math.random() * 0.7, r: Math.random() * 6 };
    this.plants.castShadow = false; gh.add(this.plants);
    this.growLight = new THREE.PointLight(0xe05ad0, 0, 55, 1.5); this.growLight.position.set(0, 2.6, 0); gh.add(this.growLight);
    // soft tunnel to the core
    const tun = M(cyl(1.1, 1.1, 9, 20).rotateZ(Math.PI / 2), hull2, 11.5, 1.5, 3); tun.rotation.y = -0.28; gh.add(tun);
    at(gh, -22, -44, 0.2);
    this.focus.greenhouse = gh.position.clone().add(new THREE.Vector3(0, 2, 0));

    // ---------------- storm shelter: regolith mound, door, four emitter pylons, shield dome
    const sh = new THREE.Group();
    sh.add(M(new THREE.SphereGeometry(7.2, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.5, 1), rust, 0, -0.2, 0));
    sh.add(M(new THREE.BoxGeometry(2.4, 2.5, 2.6), hull2, 0, 1.2, 6.3));
    sh.add(M(new THREE.BoxGeometry(1.2, 1.9, 0.14), dark, 0, 1.05, 7.64));
    sh.add(M(new THREE.BoxGeometry(0.5, 0.18, 0.1), this.windows, 0, 2.2, 7.66, false));
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4, x = Math.cos(a) * 10.5, z = Math.sin(a) * 10.5;
      sh.add(M(cyl(0.22, 0.34, 5.2, 12), steel, x, 2.6, z));
      for (let k = 0; k < 4; k++) sh.add(M(new THREE.TorusGeometry(0.42, 0.07, 8, 20).rotateX(Math.PI / 2), foil, x, 3.2 + k * 0.38, z));
      sh.add(M(new THREE.SphereGeometry(0.42, 16, 12), this.pylonTops, x, 5.5, z, false));
    }
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(13.5, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.ShaderMaterial({
      uniforms: this.domeU, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      vertexShader: `varying vec3 vN; varying vec3 vP; varying vec3 vV; void main(){ vP = position; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec3 vN; varying vec3 vP; varying vec3 vV; uniform float uCharge; uniform float uStorm; uniform float uTime;
float hex(vec2 p){ p.x *= 1.1547; p.y += mod(floor(p.x), 2.0) * 0.5; p = abs(fract(p) - 0.5); return abs(max(p.x * 1.5 + p.y, p.y * 2.0) - 1.0); }
void main(){ float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
  vec2 uv = vec2(atan(vP.z, vP.x) * 6.0, vP.y * 0.45);
  float h = smoothstep(0.06, 0.0, hex(uv * 1.2));
  float pulse = 0.65 + 0.35 * sin(uTime * 2.2 - vP.y * 0.5);
  float hit = uStorm * (0.5 + 0.5 * sin(uTime * 9.0 + vP.x * 0.9 + vP.z * 1.3)) * smoothstep(0.3, 1.0, fract(sin(dot(floor(uv * 2.0), vec2(12.9, 78.2)) + floor(uTime * 6.0)) * 437.5));
  float a = uCharge * (fres * 0.55 + h * 0.16 * pulse) + hit * uCharge * 0.5;
  gl_FragColor = vec4(mix(vec3(0.45, 0.38, 1.0), vec3(0.75, 0.9, 1.0), hit) * a * 1.6, a); }`,
    }));
    this.dome.renderOrder = 10; sh.add(this.dome);
    at(sh, 20, -52);
    this.focus.shelter = sh.position.clone().add(new THREE.Vector3(0, 3, 0));

    // ---------------- solar field
    this.panelMat = dustify(new THREE.MeshStandardMaterial({ map: solarTex(), roughness: 0.18, metalness: 0.6 }), this.dustPanels);
    const sf = new THREE.Group();
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
      const p = new THREE.Group();
      const top = M(new THREE.BoxGeometry(5.2, 0.08, 2.6), this.panelMat, 0, 1.9, 0); top.rotation.x = -0.52; p.add(top);
      const fr = M(new THREE.BoxGeometry(5.3, 0.05, 2.7), steel, 0, 1.86, 0.02); fr.rotation.x = -0.52; p.add(fr);
      p.add(M(cyl(0.07, 0.09, 1.9, 8), steel, -1.8, 0.95, 0)); p.add(M(cyl(0.07, 0.09, 1.9, 8), steel, 1.8, 0.95, 0));
      const x = 38 + (c - 2) * 6.4, z = -8 + (r - 1.5) * 5.2;
      p.position.set(x, this.ground(x, z), z); sf.add(p);
    }
    this.group.add(sf);
    this.focus.solar = new THREE.Vector3(38, this.ground(38, -8) + 2, -8);

    // ---------------- comms dish
    const dbase = new THREE.Group();
    dbase.add(M(cyl(0.9, 1.3, 1.2, 20), dark, 0, 0.6, 0));
    dbase.add(M(cyl(0.3, 0.38, 3.6, 14), steel, 0, 3.0, 0));
    const prof: THREE.Vector2[] = []; for (let i = 0; i <= 14; i++) { const r = (i / 14) * 3.1; prof.push(new THREE.Vector2(r, (r * r) / 7.2)); }
    const bowl = M(new THREE.LatheGeometry(prof, 72), dustify(new THREE.MeshStandardMaterial({ map: hullTex([12, 2]), normalMap: hullNormal([12, 2]), color: 0xf0ede6, roughness: 0.5, metalness: 0.25, side: THREE.DoubleSide }), this.dustHull));
    this.dish.add(bowl);
    this.dish.add(M(new THREE.TorusGeometry(3.1, 0.07, 8, 72).rotateX(Math.PI / 2), steel, 0, (3.1 * 3.1) / 7.2, 0));
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const rib = M(new THREE.BoxGeometry(3.0, 0.05, 0.06), steel, Math.cos(a) * 1.5, 0.28, Math.sin(a) * 1.5); rib.rotation.y = -a; rib.rotation.z = 0.4; this.dish.add(rib); }
    this.dish.add(M(cyl(0.5, 0.35, 0.6, 16), dark, 0, -0.3, 0));
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; const st = M(cyl(0.03, 0.03, 3.3, 6), steel, Math.cos(a) * 1.3, 2.0, Math.sin(a) * 1.3); st.rotation.z = Math.cos(a) * 0.72; st.rotation.x = -Math.sin(a) * 0.72; this.dish.add(st); }
    this.dish.add(M(cyl(0.22, 0.16, 0.45, 12), dark, 0, 2.75, 0));
    this.dish.add(M(new THREE.SphereGeometry(0.12, 10, 8), this.dishLamp, 0, 3.05, 0, false));
    this.dish.position.y = 5.0; dbase.add(this.dish);
    at(dbase, -34, -14);
    this.focus.dish = dbase.position.clone().add(new THREE.Vector3(0, 5, 0));

    // ---------------- air maker: tanks, pipes, chimney, plume
    const am = new THREE.Group();
    for (const [x, z, hgt] of [[-1.5, 0, 3.6], [0.3, 0.9, 4.4], [1.9, -0.2, 3.2]] as number[][]) { am.add(M(new THREE.CapsuleGeometry(0.75, hgt, 8, 20), hull2, x, hgt / 2 + 0.95, z)); am.add(M(cyl(0.9, 0.9, 0.25, 20), dark, x, 0.12, z)); }
    am.add(M(cyl(0.28, 0.34, 6.4, 14), steel, 3.4, 3.2, 1.4));
    am.add(M(new THREE.TorusGeometry(0.9, 0.09, 8, 24, Math.PI).rotateY(0.5), foil, 0.3, 3.0, 0.4));
    am.add(M(new THREE.BoxGeometry(2.2, 1.3, 1.4), dark, -0.2, 0.65, -2.0));
    am.add(M(new THREE.BoxGeometry(0.5, 0.18, 0.06), new THREE.MeshStandardMaterial({ color: 0x06141a, emissive: 0x5cc8f0, emissiveIntensity: 1.6 }), -0.2, 0.95, -1.28, false));
    const N = 90, pp = new Float32Array(N * 3), ph = new Float32Array(N);
    for (let i = 0; i < N; i++) { ph[i] = Math.random(); pp[i * 3] = 3.4; pp[i * 3 + 1] = 6.4; pp[i * 3 + 2] = 1.4; }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); pg.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
    this.plume = new THREE.Points(pg, new THREE.ShaderMaterial({
      uniforms: this.plumeU, transparent: true, depthWrite: false,
      vertexShader: `attribute float aPhase; uniform float uTime; uniform float uLevel; varying float vA; void main(){ float t = fract(aPhase + uTime * 0.07); vec3 p = position + vec3(sin(aPhase * 40.0 + t * 3.0) * t * 1.6 + t * 2.2, t * (4.0 + uLevel * 5.0), cos(aPhase * 31.0) * t * 1.4); vA = (1.0 - t) * t * 4.0 * uLevel; vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = (60.0 + 260.0 * t) / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(0.92, 0.9, 0.86), smoothstep(0.5, 0.0, d) * vA * 0.22); }`,
    }));
    this.plume.frustumCulled = false; am.add(this.plume);
    at(am, 10, -30);
    this.focus.airmaker = am.position.clone().add(new THREE.Vector3(0, 3, 0));

    // ---------------- rover (home pad) and its twin in the field
    const makeRover = (g: THREE.Group) => {
      g.add(M(new THREE.CapsuleGeometry(1.0, 2.6, 8, 24).rotateZ(Math.PI / 2), hull, 0.2, 1.72, 0));
      g.add(M(new THREE.BoxGeometry(5.2, 0.42, 2.5), dark, 0, 0.98, 0));
      g.add(M(new THREE.BoxGeometry(1.5, 1.25, 2.2), hull2, -1.85, 1.75, 0));
      for (const z of [-1.18, 1.18]) { g.add(M(new THREE.BoxGeometry(2.2, 0.5, 0.3), foil, 0.3, 1.35, z)); g.add(M(new THREE.BoxGeometry(5.0, 0.08, 0.5), dark, 0, 1.32, z * 1.2)); }
      for (const x of [-0.5, 0.5]) g.add(M(new THREE.TorusGeometry(1.02, 0.045, 8, 32).rotateY(Math.PI / 2), steel, x + 0.2, 1.72, 0));
      g.add(M(new THREE.SphereGeometry(0.95, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2).rotateZ(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x0c1418, roughness: 0.08, metalness: 0.9 }), 2.15, 1.85, 0));
      for (const x of [-1.7, 0, 1.7]) for (const z of [-1.35, 1.35]) { g.add(M(cyl(0.62, 0.62, 0.5, 24).rotateX(Math.PI / 2), dark, x, 0.62, z)); g.add(M(cyl(0.3, 0.3, 0.54, 12).rotateX(Math.PI / 2), steel, x, 0.62, z)); }
      g.add(M(cyl(0.05, 0.05, 1.7, 6), steel, -1.4, 3.3, 0.4)); g.add(M(new THREE.BoxGeometry(0.4, 0.22, 0.3), dark, -1.4, 4.2, 0.4));
      g.add(M(new THREE.BoxGeometry(1.6, 0.06, 1.9), this.panelMat, -0.6, 2.98, 0));
      const lampM = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xfff2d0, emissiveIntensity: 2 });
      for (const z of [-0.6, 0.6]) g.add(M(new THREE.SphereGeometry(0.11, 10, 8), lampM, 2.95, 1.25, z, false));
      // drill arm
      const arm = M(cyl(0.07, 0.07, 2.2, 8), steel, 2.6, 1.3, -0.9); arm.rotation.z = -1.0; g.add(arm);
      g.add(M(cyl(0.12, 0.05, 0.7, 10), foil, 3.45, 0.45, -0.9));
    };
    makeRover(this.rover); makeRover(this.fieldRover);
    const pad = M(cyl(4.6, 4.8, 0.12, 40), new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 0.95 }), 0, 0.02, 0, false);
    at(pad, -8, -10); at(this.rover, -8, -10, 0.1); this.rover.rotation.y = 0.6;
    this.focus.garage = this.rover.position.clone().add(new THREE.Vector3(0, 1.5, 0));

    // ---------------- landing pad and ascent ship
    const lp = new THREE.Group();
    lp.add(M(cyl(15, 15.4, 0.16, 72), new THREE.MeshStandardMaterial({ color: 0x3d342d, roughness: 0.98 }), 0, 0.02, 0, false));
    lp.add(M(new THREE.TorusGeometry(11, 0.16, 6, 90).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xe8e2d2, roughness: 0.8 }), 0, 0.12, 0, false));
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; lp.add(M(cyl(0.12, 0.14, 0.5, 8), dark, Math.cos(a) * 14.2, 0.3, Math.sin(a) * 14.2)); lp.add(M(new THREE.SphereGeometry(0.14, 8, 6), this.bollards, Math.cos(a) * 14.2, 0.6, Math.sin(a) * 14.2, false)); }
    const s = this.ship;
    s.add(M(cyl(2.3, 2.6, 9.5, 48), hull, 0, 7.6, 0));
    s.add(M(new THREE.ConeGeometry(2.3, 4.4, 48), hull2, 0, 14.5, 0));
    s.add(M(cyl(2.62, 2.2, 1.0, 48), dark, 0, 2.5, 0));
    s.add(M(new THREE.CylinderGeometry(0.9, 1.5, 1.7, 28, 1, true), new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.4, metalness: 0.9, side: THREE.DoubleSide }), 0, 1.3, 0));
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.78; const leg = M(cyl(0.14, 0.18, 5.4, 10), steel, Math.cos(a) * 3.5, 2.3, Math.sin(a) * 3.5); leg.rotation.z = Math.cos(a) * 0.5; leg.rotation.x = -Math.sin(a) * 0.5; s.add(leg); s.add(M(cyl(0.7, 0.8, 0.14, 16), dark, Math.cos(a) * 4.75, 0.08, Math.sin(a) * 4.75)); }
    for (const y of [5.2, 8.4, 11.6]) s.add(M(new THREE.TorusGeometry(2.42, 0.07, 8, 60).rotateX(Math.PI / 2), steel, 0, y, 0));
    for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.4; const w = M(new THREE.BoxGeometry(0.6, 0.6, 0.12), this.windows, Math.cos(a) * 2.36, 10.3, Math.sin(a) * 2.36, false); w.rotation.y = -a + Math.PI / 2; s.add(w); }
    this.shipFlame = new THREE.Mesh(new THREE.ConeGeometry(1.3, 9, 24, 1, true).rotateX(Math.PI), new THREE.MeshBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    this.shipFlame.position.y = -3.6; s.add(this.shipFlame);
    lp.add(s);
    { // regolith kicked up by the engines: ballistic particles under Mars gravity, 3.73 m/s² mean (NASA Mars Fact Sheet)
      const N = 2600, p0 = new Float32Array(N * 3), v = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) { const a = Math.random() * 6.283, r = 2 + Math.random() * 7, sp = 6 + Math.random() * 20; p0[i * 3] = Math.cos(a) * r; p0[i * 3 + 1] = 0.2; p0[i * 3 + 2] = Math.sin(a) * r; v[i * 3] = Math.cos(a) * sp; v[i * 3 + 1] = 2 + Math.random() * 14; v[i * 3 + 2] = Math.sin(a) * sp; }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p0, 3)); g.setAttribute('aVel', new THREE.BufferAttribute(v, 3));
      this.launchDust = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: this.launchU, transparent: true, depthWrite: false,
        vertexShader: 'attribute vec3 aVel; uniform float uT; varying float vA; void main(){ float life = 9.0 + fract(aVel.x * 3.7) * 9.0; float t = mod(max(uT, 0.0) + fract(aVel.z * 1.3) * life, life); vec3 p = position + aVel * t + vec3(0.0, -0.5 * 3.73 * t * t, 0.0); p.y = max(p.y, 0.15); vA = uT < 0.0 ? 0.0 : smoothstep(0.0, 0.6, t) * (1.0 - t / life) * smoothstep(0.0, 3.0, uT) * (1.0 - smoothstep(22.0, 40.0, uT)); vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = (700.0 + 900.0 * t) / -mv.z; gl_Position = projectionMatrix * mv; }',
        fragmentShader: 'varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(0.62, 0.42, 0.28, smoothstep(0.5, 0.05, d) * vA * 0.11); }' }));
      this.launchDust.frustumCulled = false; this.launchDust.renderOrder = 15; lp.add(this.launchDust);
    }
    at(lp, 0, 60);
    this.focus.pad = lp.position.clone().add(new THREE.Vector3(0, 8, 0));

    // ---------------- path lights between buildings
    const paths: [number, number][] = [[0, -28], [-6, -22], [-12, -30], [-16, -38], [6, -26], [14, -38], [18, -44], [-20, -16], [-28, -14], [10, -16], [22, -12], [0, -12], [0, 4], [0, 20], [0, 36]];
    for (const [x, z] of paths) { const b = new THREE.Group(); b.add(M(cyl(0.05, 0.07, 0.9, 6), dark, 0, 0.45, 0, false)); b.add(M(new THREE.SphereGeometry(0.1, 8, 6), this.bollards, 0, 0.95, 0, false)); at(b, x, z); }

    // ---------------- rocks (procedural, instanced)
    const rockGeo = new THREE.IcosahedronGeometry(1, 1);
    const rp = rockGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < rp.count; i++) { const k = 0.72 + Math.sin(rp.getX(i) * 5.1 + rp.getY(i) * 3.7) * 0.16 + Math.cos(rp.getZ(i) * 4.3) * 0.12; rp.setXYZ(i, rp.getX(i) * k, rp.getY(i) * k * 0.7, rp.getZ(i) * k); }
    rockGeo.computeVertexNormals();
    const rocks = new THREE.InstancedMesh(rockGeo, new THREE.MeshStandardMaterial({ color: 0x5a3626, roughness: 1, flatShading: true }), 900);
    let seed = 1234; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 900; i++) {
      const a = rnd() * Math.PI * 2, d = 14 + Math.pow(rnd(), 1.6) * 520; let x = Math.cos(a) * d, z = Math.sin(a) * d - 20;
      if (Math.hypot(x, z - 60) < 17) x += 30;
      const sc = 0.12 + Math.pow(rnd(), 3) * 1.5;
      this.dummy.position.set(x, this.ground(x, z) + sc * 0.2, z); this.dummy.rotation.set(rnd() * 3, rnd() * 6, rnd() * 3); this.dummy.scale.set(sc * (0.7 + rnd() * 0.6), sc * (0.5 + rnd() * 0.5), sc * (0.7 + rnd() * 0.6)); this.dummy.updateMatrix();
      rocks.setMatrixAt(i, this.dummy.matrix);
    }
    rocks.castShadow = true; rocks.receiveShadow = true; this.group.add(rocks);
    this.fallbackRocks = rocks;
    this.focus.sky = new THREE.Vector3(0, 60, -400);
  }

  private fallbackRocks: THREE.Object3D | null = null;

  /** Keep-out circles [x, z, radius] so rocks never sit inside buildings, the pad or the solar field. */
  private static CLEAR: [number, number, number][] = [[0, -38, 13], [13, -39, 9], [-22, -44, 12], [20, -52, 15], [38, -8, 22], [-34, -14, 5], [10, -30, 6], [-8, -10, 7], [0, 60, 19], [-16, 0, 5]];
  private clear(x: number, z: number, pad = 0) { return Outpost.CLEAR.every(([cx, cz, r]) => Math.hypot(x - cx, z - cz) > r + pad); }

  /**
   * Scanned rocks (Poly Haven, CC0) in natural clusters: a boulder or two, mid-size rocks around them, gravel
   * spilling outward. Each is half-buried and randomly turned. Replaces the procedural stand-ins.
   */
  scatterRocks(models: { geometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial }[], count: number) {
    if (!models.length) return;
    if (this.fallbackRocks) { this.group.remove(this.fallbackRocks); this.fallbackRocks = null; }
    let seed = 977; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const lists: THREE.Matrix4[][] = models.map(() => []);
    const put = (x: number, z: number, size: number, bury: number) => {
      if (!this.clear(x, z, size * 0.6)) return;
      const k = Math.floor(rnd() * models.length);
      this.dummy.position.set(x, this.ground(x, z) - size * bury, z);
      this.dummy.rotation.set((rnd() - 0.5) * 0.5, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.5);
      this.dummy.scale.set(size * (0.8 + rnd() * 0.5), size * (0.65 + rnd() * 0.45), size * (0.8 + rnd() * 0.5));
      this.dummy.updateMatrix(); lists[k].push(this.dummy.matrix.clone());
    };
    const clusters = Math.round(count / 22);
    for (let c = 0; c < clusters; c++) {
      const a = rnd() * Math.PI * 2, d = 16 + Math.pow(rnd(), 1.5) * 420, cx = Math.cos(a) * d, cz = Math.sin(a) * d - 22;
      const big = 0.9 + Math.pow(rnd(), 2.2) * 3.4;
      put(cx, cz, big, 0.22); if (rnd() < 0.4) put(cx + big * 0.9, cz + (rnd() - 0.5) * big, big * 0.6, 0.25);
      for (let i = 0; i < 5; i++) { const r = big * (0.6 + rnd() * 1.6), t = rnd() * 6.28; put(cx + Math.cos(t) * r, cz + Math.sin(t) * r, 0.25 + rnd() * 0.55, 0.3); }
      for (let i = 0; i < 15; i++) { const r = big * (0.5 + rnd() * 3.2), t = rnd() * 6.28; put(cx + Math.cos(t) * r, cz + Math.sin(t) * r, 0.06 + rnd() * 0.16, 0.35); }
    }
    for (let i = 0; i < count * 0.35; i++) { const a = rnd() * 6.28, d = 8 + Math.pow(rnd(), 1.3) * 260; put(Math.cos(a) * d, Math.sin(a) * d - 22, 0.05 + Math.pow(rnd(), 3) * 0.5, 0.35); }
    models.forEach((m, k) => {
      if (!lists[k].length) return;
      const im = new THREE.InstancedMesh(m.geometry, m.material, lists[k].length);
      lists[k].forEach((mx, i) => im.setMatrixAt(i, mx));
      im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; this.group.add(im);
    });
  }

  /** The real Perseverance rover model (NASA 3D Resources; logos removed), parked by the garage as the "old explorer". */
  addExplorer(model: THREE.Object3D) {
    const x = -17, z = 1;
    model.position.set(x, this.ground(x, z) + 0.02, z); model.rotation.y = 2.3; model.scale.setScalar(1.0);
    this.group.add(model);
    this.focus.explorer = model.position.clone().add(new THREE.Vector3(0, 1, 0));
  }

  placeFieldRover(x: number, z: number, yaw: number) {
    this.fieldRover.position.set(x, this.ground(x, z) + 0.1, z); this.fieldRover.rotation.y = yaw;
    if (!this.fieldRover.parent) this.group.add(this.fieldRover);
    this.focus.delta = this.fieldRover.position.clone().add(new THREE.Vector3(0, 2, 0));
  }

  setState(st: OutpostState) { this.state = st; this.rover.visible = st.roverHome; this.fieldRover.visible = !st.roverHome; }

  /** 0..1 launch progress for the ending shots. */
  launch(t: number) { this.launchU.uT.value = t > 0 ? t * 16 : -1; this.ship.position.y = Math.max(0, t - 0.12) * Math.max(0, t - 0.12) * 1100; (this.shipFlame.material as THREE.MeshBasicMaterial).opacity = t > 0 ? 0.85 : 0; this.shipFlame.scale.setScalar(1 + Math.sin(performance.now() * 0.05) * 0.08); }

  update(time: number, earthDir: THREE.Vector3) {
    const st = this.state; if (!st) return;
    const pw = THREE.MathUtils.clamp(st.power / 40, 0.12, 1);
    const night = st.night;
    this.windows.emissiveIntensity = (0.5 + 2.6 * night) * pw * (0.96 + 0.04 * Math.sin(time * 7.3) * (st.power < 15 ? 6 : 0));
    this.habLight.intensity = 55 * night * pw;
    this.bollards.emissiveIntensity = 2.2 * night * pw;
    const g = st.plantsDead ? 0 : [0, 0.3, 0.75, 1.15][st.garden] ?? 0;
    this.led.emissiveIntensity = 0.08 + 3.2 * g;
    this.growLight.intensity = g * (70 + 260 * night);
    const grow = st.plantsDead ? 0.12 : 0.2 + (st.plants / 100) * 1.25;
    for (let i = 0; i < this.plantSeeds.length; i++) {
      const p = this.plantSeeds[i]; const s = grow * p.s * (1 + 0.03 * Math.sin(time * 0.9 + p.r));
      this.dummy.position.set(p.x, p.y + s * 0.2, p.z); this.dummy.rotation.set(0, p.r, 0); this.dummy.scale.set(s, s * (st.plantsDead ? 0.35 : 1.25), s); this.dummy.updateMatrix();
      this.plants.setMatrixAt(i, this.dummy.matrix);
    }
    this.plants.instanceMatrix.needsUpdate = true;
    (this.plants.material as THREE.MeshStandardMaterial).color.set(st.plantsDead ? 0x5a4a2a : st.plants < 25 ? 0x7d8a3a : 0x3f9a4a);
    this.domeU.uCharge.value += ((st.shield / 100) * (0.25 + 0.75 * Math.max(st.storm, st.shieldLevel > 0 ? 0.45 : 0.15)) - this.domeU.uCharge.value) * 0.05;
    this.domeU.uStorm.value = st.storm; this.domeU.uTime.value = time;
    this.pylonTops.emissiveIntensity = 0.15 + (st.shield / 100) * 3.2 * (0.7 + 0.3 * Math.sin(time * 3));
    this.dustPanels.value += ((st.panelsDusty ? 0.95 : 0.1 + st.dust * 0.5) - this.dustPanels.value) * 0.03;
    this.dustHull.value += ((st.panelsDusty ? 0.55 : 0.28 + st.dust * 0.3) - this.dustHull.value) * 0.02;
    this.plumeU.uTime.value = time; this.plumeU.uLevel.value += ([0, 0.35, 0.7, 1][st.life] - this.plumeU.uLevel.value) * 0.05;
    // the dish follows Earth
    const d = earthDir; this.dish.rotation.set(0, 0, 0);
    this.dish.lookAt(this.dish.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(d.x, Math.max(d.y, 0.15), d.z)));
    this.dish.rotateX(Math.PI / 2);
    this.dishLamp.emissiveIntensity = 1.2 + 1.8 * Math.max(0, Math.sin(time * 2.4));

  }
}
