// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
/**
 * terrain.ts — the REAL terrain of Jezero Crater.
 * Elevation: Mars Reconnaissance Orbiter CTX stereo model (20 m/pixel), image: CTX mosaic (6 m/pixel),
 * processed by USGS Astrogeology for Mars 2020. Built by web/scripts/build-terrain.mjs. Vertical scale 1:1.
 *
 * "Hero zone": within about a kilometre of the outpost the surface is dressed with real scanned ground
 * (Poly Haven, CC0) blended by noise at two scales so tiling never shows, then tinted by the real orbital
 * image. Beyond that the orbital data carries the picture. Detail below the data's resolution is not data.
 */
import * as THREE from 'three';
import type { GroundSet } from './assets';

export interface TerrainMeta {
  mapSizeMetres: number; cosLat: number; heightSamples: number;
  elevationMetres: { min: number; max: number };
  outpost: { u: number; v: number };
  source: { caption: string };
}

const COMMON = /* glsl */ `
varying vec3 vWPos;
uniform float uDust; uniform float uDetail; uniform float uFrost; uniform float uGround;
uniform sampler2D tAd, tAn, tAr, tBd, tBn, tBr, tCd, tCn, tCr; uniform vec3 uAvgA, uAvgB, uAvgC;
uniform sampler2D tTracks; uniform vec4 uTrackRect;
float gHero, gWB, gWC, gMix, gTrack; vec2 gP;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0; for(int i=0;i<4;i++){ s += a*vnoise(p); p = p*2.03 + 17.1; a *= 0.5; } return s; }`;

const MAP = /* glsl */ `
{ // tint the real greyscale orbital image with Mars colours, then dress the hero zone with scanned ground
  float l = pow(diffuseColor.r, 0.8);
  vec3 c0 = vec3(0.080, 0.040, 0.028), c1 = vec3(0.330, 0.150, 0.085), c2 = vec3(0.590, 0.340, 0.190), c3 = vec3(0.800, 0.600, 0.400);
  vec3 tint = l < 0.35 ? mix(c0, c1, l/0.35) : l < 0.7 ? mix(c1, c2, (l-0.35)/0.35) : mix(c2, c3, (l-0.7)/0.3);
  float dist = length(vWPos - cameraPosition);
  gP = vWPos.xz;
  gHero = uGround * uDetail * (1.0 - smoothstep(160.0, 1100.0, dist));
  gMix = 0.35 + 0.45 * smoothstep(12.0, 140.0, dist);
#ifdef LITE
  gWB = 0.0; gWC = 0.0;
  if (gHero > 0.002) { vec3 a = texture2D(tAd, gP / 3.6).rgb / uAvgA; float rl = dot(a, vec3(0.3333)); tint *= mix(vec3(1.0), clamp(mix(vec3(rl), a, 0.22), 0.15, 2.4), gHero); }
#else
  gWB = smoothstep(0.40, 0.62, fbm(gP * 0.013));
  gWC = smoothstep(0.58, 0.74, fbm(gP * 0.031 + 31.7)) * 0.85;
  float macro = 0.80 + 0.40 * fbm(gP * 0.0045 + 7.3);
  if (gHero > 0.002) {
    vec3 a = mix(texture2D(tAd, gP / 3.6).rgb, texture2D(tAd, gP / 21.0 + 0.37).rgb, gMix) / uAvgA;
    vec3 b = mix(texture2D(tBd, gP / 4.4).rgb, texture2D(tBd, gP / 26.0 + 0.11).rgb, gMix) / uAvgB;
    vec3 c = mix(texture2D(tCd, gP / 6.5).rgb, texture2D(tCd, gP / 33.0 + 0.53).rgb, gMix) / uAvgC;
    vec3 rel = mix(mix(a, b, gWB), c, gWC);
    // keep the scans' light and shade but only a little of their own colour, so everything stays Mars-coloured
    float rl = dot(rel, vec3(0.3333));
    rel = mix(vec3(rl), rel, 0.22);
    tint *= mix(vec3(1.0), clamp(rel, 0.15, 2.4) * macro, gHero);
  } else {
    float near = uDetail * (1.0 - uGround) * (1.0 - smoothstep(60.0, 1400.0, dist));
    tint *= 1.0 + near * ((fbm(gP * 0.9) * 0.6 + fbm(gP * 0.11) * 0.4 - 0.5) * 0.55);
  }
#endif
  // rover tracks and footprints stamped around the base
  vec2 tuv = (gP - uTrackRect.xy) / uTrackRect.zw;
  gTrack = (tuv.x > 0.0 && tuv.x < 1.0 && tuv.y > 0.0 && tuv.y < 1.0) ? texture2D(tTracks, tuv).r : 0.0;
  tint *= 1.0 - gTrack * 0.38;
  tint = mix(tint, vec3(0.52, 0.34, 0.22), uDust * 0.35);
  if (uFrost > 0.001) tint = mix(tint, vec3(0.78, 0.84, 0.90), uFrost * smoothstep(0.35, 0.8, fbm(gP * 0.35)) * 0.55);
  diffuseColor.rgb = tint;
}`;

const ROUGH = /* glsl */ `
#ifndef LITE
if (gHero > 0.002) {
  float ra = texture2D(tAr, gP / 3.6).g, rb = texture2D(tBr, gP / 4.4).g, rc = texture2D(tCr, gP / 6.5).g;
  roughnessFactor = mix(roughnessFactor, clamp(mix(mix(ra, rb, gWB), rc, gWC), 0.6, 1.0), gHero);
}
#endif`;

const NORMAL = /* glsl */ `
{ // scanned micro-relief in the hero zone, procedural grain elsewhere (neither is elevation data)
#ifdef LITE
  if (gHero > 0.002) { vec3 n = texture2D(tAn, gP / 3.6).xyz * 2.0 - 1.0; normal = normalize(normal + (viewMatrix * vec4(n.x * 1.5, 0.0, n.y * 1.5, 0.0)).xyz * gHero); }
#else
  if (gHero > 0.002) {
    vec3 a = mix(texture2D(tAn, gP / 3.6).xyz, texture2D(tAn, gP / 21.0 + 0.37).xyz, gMix) * 2.0 - 1.0;
    vec3 b = mix(texture2D(tBn, gP / 4.4).xyz, texture2D(tBn, gP / 26.0 + 0.11).xyz, gMix) * 2.0 - 1.0;
    vec3 c = mix(texture2D(tCn, gP / 6.5).xyz, texture2D(tCn, gP / 33.0 + 0.53).xyz, gMix) * 2.0 - 1.0;
    vec3 n = mix(mix(a, b, gWB), c, gWC);
    float e = 1.0 / 512.0;
    vec2 tuv = (gP - uTrackRect.xy) / uTrackRect.zw;
    vec2 tg = gTrack > 0.0 ? vec2(texture2D(tTracks, tuv + vec2(e, 0.0)).r - texture2D(tTracks, tuv - vec2(e, 0.0)).r, texture2D(tTracks, tuv + vec2(0.0, e)).r - texture2D(tTracks, tuv - vec2(0.0, e)).r) : vec2(0.0);
    normal = normalize(normal + (viewMatrix * vec4(n.x * 1.5 + tg.x * 2.5, 0.0, n.y * 1.5 + tg.y * 2.5, 0.0)).xyz * gHero);
  } else if (uGround < 0.5) {
    float dist = length(vWPos - cameraPosition);
    float near = uDetail * (1.0 - smoothstep(30.0, 900.0, dist));
    float e = 0.35;
    float hx = fbm((gP + vec2(e, 0.0)) * 0.9) - fbm((gP - vec2(e, 0.0)) * 0.9);
    float hz = fbm((gP + vec2(0.0, e)) * 0.9) - fbm((gP - vec2(0.0, e)) * 0.9);
    normal = normalize((viewMatrix * vec4(-hx, 0.0, -hz, 0.0)).xyz * 2.2 * near + normal);
  }
#endif
}`;

export class Terrain {
  mesh!: THREE.Mesh;
  meta!: TerrainMeta;
  tracks = document.createElement('canvas');
  private trackTex!: THREE.CanvasTexture;
  uniforms: Record<string, { value: any }> = {
    uDust: { value: 0 }, uDetail: { value: 1 }, uFrost: { value: 0 }, uGround: { value: 0 },
    tAd: { value: null }, tAn: { value: null }, tAr: { value: null }, tBd: { value: null }, tBn: { value: null }, tBr: { value: null }, tCd: { value: null }, tCn: { value: null }, tCr: { value: null },
    uAvgA: { value: new THREE.Vector3(1, 1, 1) }, uAvgB: { value: new THREE.Vector3(1, 1, 1) }, uAvgC: { value: new THREE.Vector3(1, 1, 1) },
    tTracks: { value: null }, uTrackRect: { value: new THREE.Vector4(-128, -128, 256, 256) },
  };
  private H!: Float32Array;
  private n = 0;
  private sizeX = 0; private sizeZ = 0; private ox = 0; private oz = 0; private base = 0;

  /** Real scanned ground (Poly Haven, CC0) for the hero zone around the outpost. */
  setGround(sets: GroundSet[]) {
    const u = this.uniforms, [a, b, c] = sets;
    u.tAd.value = a.diff; u.tAn.value = a.nor; u.tAr.value = a.rough; u.uAvgA.value = a.avg;
    u.tBd.value = b.diff; u.tBn.value = b.nor; u.tBr.value = b.rough; u.uAvgB.value = b.avg;
    u.tCd.value = c.diff; u.tCn.value = c.nor; u.tCr.value = c.rough; u.uAvgC.value = c.avg;
    u.uGround.value = 1;
  }

  /** Stamp a soft dark mark (wheel rut or boot print) into the track map. x,z in world metres. */
  stamp(x: number, z: number, radius: number, strength = 0.8) {
    const r = this.uniforms.uTrackRect.value as THREE.Vector4, cv = this.tracks, cx = cv.getContext('2d')!;
    const px = ((x - r.x) / r.z) * cv.width, py = ((z - r.y) / r.w) * cv.height, pr = (radius / r.z) * cv.width;
    const g = cx.createRadialGradient(px, py, 0, px, py, pr);
    g.addColorStop(0, `rgba(255,255,255,${strength})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    cx.fillStyle = g; cx.beginPath(); cx.arc(px, py, pr, 0, 7); cx.fill();
    this.trackTex.needsUpdate = true;
  }
  /** A pair of wheel ruts along a path of [x, z] points. */
  track(path: [number, number][], gauge = 2.7, width = 0.5) {
    for (let i = 1; i < path.length; i++) {
      const [x0, z0] = path[i - 1], [x1, z1] = path[i], len = Math.hypot(x1 - x0, z1 - z0), nx = -(z1 - z0) / len, nz = (x1 - x0) / len;
      for (let d = 0; d < len; d += 0.22) { const t = d / len, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; const k = 0.55 + 0.3 * Math.sin(d * 9); for (const s of [-1, 1]) this.stamp(x + (nx * s * gauge) / 2, z + (nz * s * gauge) / 2, width, k); }
    }
  }
  footprints(path: [number, number][]) {
    for (let i = 1; i < path.length; i++) {
      const [x0, z0] = path[i - 1], [x1, z1] = path[i], len = Math.hypot(x1 - x0, z1 - z0), nx = -(z1 - z0) / len, nz = (x1 - x0) / len;
      for (let d = 0, k = 0; d < len; d += 0.62, k++) { const t = d / len, s = k % 2 ? 1 : -1; this.stamp(x0 + (x1 - x0) * t + nx * s * 0.2, z0 + (z1 - z0) * t + nz * s * 0.2, 0.2, 0.75); }
    }
  }

  async load(base: string, segments: number, anisotropy: number, lite = false): Promise<void> {
    const [meta, blob] = await Promise.all([
      fetch(base + 'terrain/jezero.json').then((r) => r.json()),
      fetch(base + 'terrain/height.png').then((r) => r.blob()),
    ]);
    this.meta = meta;
    const bmp = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
    const n = (this.n = bmp.width);
    const cv = new OffscreenCanvas(n, n);
    const cx = cv.getContext('2d', { willReadFrequently: true })!;
    cx.drawImage(bmp, 0, 0);
    const px = cx.getImageData(0, 0, n, n).data;
    const { min, max } = meta.elevationMetres;
    this.H = new Float32Array(n * n);
    for (let i = 0; i < n * n; i++) this.H[i] = min + (((px[i * 4] << 8) | px[i * 4 + 1]) / 65535) * (max - min);

    this.sizeX = meta.mapSizeMetres * meta.cosLat;
    this.sizeZ = meta.mapSizeMetres;
    this.ox = meta.outpost.u * this.sizeX;
    this.oz = meta.outpost.v * this.sizeZ;
    this.base = 0;
    this.base = this.heightAt(0, 0);

    // geometry built directly in world space: +X east, +Y up, +Z south, origin at the outpost
    const S = segments, V = S + 1;
    const pos = new Float32Array(V * V * 3), uv = new Float32Array(V * V * 2);
    for (let j = 0; j < V; j++) for (let i = 0; i < V; i++) {
      const u = i / S, v = j / S, k = j * V + i;
      const x = u * this.sizeX - this.ox, z = v * this.sizeZ - this.oz;
      pos[k * 3] = x; pos[k * 3 + 1] = this.heightAt(x, z); pos[k * 3 + 2] = z;
      uv[k * 2] = u; uv[k * 2 + 1] = 1 - v;
    }
    const idx = new Uint32Array(S * S * 6);
    let t = 0;
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const a = j * V + i, b = a + 1, c = a + V, d = c + 1;
      idx[t++] = a; idx[t++] = c; idx[t++] = b; idx[t++] = b; idx[t++] = c; idx[t++] = d;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();

    const loader = new THREE.TextureLoader();
    const [albedo, normal] = await Promise.all([loader.loadAsync(base + 'terrain/albedo.webp'), loader.loadAsync(base + 'terrain/normal.png')]);
    albedo.colorSpace = THREE.SRGBColorSpace;
    for (const tx of [albedo, normal]) { tx.anisotropy = anisotropy; tx.wrapS = tx.wrapT = THREE.ClampToEdgeWrapping; }

    this.tracks.width = this.tracks.height = 2048;
    this.trackTex = new THREE.CanvasTexture(this.tracks);
    this.trackTex.colorSpace = THREE.NoColorSpace; this.trackTex.anisotropy = anisotropy;
    this.uniforms.tTracks.value = this.trackTex;

    const mat = new THREE.MeshStandardMaterial({ map: albedo, normalMap: normal, normalMapType: THREE.ObjectSpaceNormalMap, roughness: 0.96, metalness: 0 });
    mat.envMapIntensity = 0.55;
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.uniforms);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWPos = position;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\n' + (lite ? '#define LITE\n' : '') + COMMON)
        .replace('#include <map_fragment>', '#include <map_fragment>\n' + MAP)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' + ROUGH)
        .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + NORMAL);
    };
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.receiveShadow = true;
    this.mesh.matrixAutoUpdate = false;
    this.mesh.name = 'jezero-terrain';
  }

  /** Real ground height (metres, relative to the outpost) at world x (east), z (south). Bilinear. */
  heightAt(x: number, z: number): number {
    const n = this.n;
    const fx = THREE.MathUtils.clamp(((x + this.ox) / this.sizeX) * (n - 1), 0, n - 1.001);
    const fz = THREE.MathUtils.clamp(((z + this.oz) / this.sizeZ) * (n - 1), 0, n - 1.001);
    const i = Math.floor(fx), j = Math.floor(fz), a = fx - i, b = fz - j, H = this.H;
    const h = (H[j * n + i] * (1 - a) + H[j * n + i + 1] * a) * (1 - b) + (H[(j + 1) * n + i] * (1 - a) + H[(j + 1) * n + i + 1] * a) * b;
    return h - this.base;
  }

  /** Highest ground within `r` metres — used to keep cameras above the terrain. */
  maxHeightNear(x: number, z: number, r: number): number {
    let m = -Infinity;
    for (let dz = -r; dz <= r; dz += r / 2) for (let dx = -r; dx <= r; dx += r / 2) m = Math.max(m, this.heightAt(x + dx, z + dz));
    return m;
  }
}
