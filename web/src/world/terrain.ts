// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
/**
 * terrain.ts — the REAL terrain of Jezero Crater.
 * Elevation: NASA Mars Reconnaissance Orbiter CTX stereo model (20 m/pixel), image: CTX mosaic (6 m/pixel),
 * processed by USGS Astrogeology for NASA Mars 2020. Built by web/scripts/build-terrain.mjs.
 * Vertical scale is 1:1. Detail smaller than the data (rocks, grain) is procedural and labelled as such.
 */
import * as THREE from 'three';

export interface TerrainMeta {
  mapSizeMetres: number; cosLat: number; heightSamples: number;
  elevationMetres: { min: number; max: number };
  outpost: { u: number; v: number };
  source: { caption: string };
}

export class Terrain {
  mesh!: THREE.Mesh;
  meta!: TerrainMeta;
  uniforms = { uDust: { value: 0 }, uDetail: { value: 1 }, uFrost: { value: 0 } };
  private H!: Float32Array;
  private n = 0;
  private sizeX = 0; private sizeZ = 0; private ox = 0; private oz = 0; private base = 0;

  async load(base: string, segments: number, anisotropy: number): Promise<void> {
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

    const mat = new THREE.MeshStandardMaterial({ map: albedo, normalMap: normal, normalMapType: THREE.ObjectSpaceNormalMap, roughness: 0.96, metalness: 0 });
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.uniforms);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWPos = position;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
varying vec3 vWPos;
uniform float uDust; uniform float uDetail; uniform float uFrost;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0; for(int i=0;i<4;i++){ s += a*vnoise(p); p = p*2.03 + 17.1; a *= 0.5; } return s; }`)
        .replace('#include <map_fragment>', `#include <map_fragment>
{ // tint the real greyscale orbital image with Mars colours, then add procedural grain below the data's resolution
  float l = pow(diffuseColor.r, 0.8);
  vec3 c0 = vec3(0.080, 0.040, 0.028), c1 = vec3(0.330, 0.150, 0.085), c2 = vec3(0.590, 0.340, 0.190), c3 = vec3(0.800, 0.600, 0.400);
  vec3 tint = l < 0.35 ? mix(c0, c1, l/0.35) : l < 0.7 ? mix(c1, c2, (l-0.35)/0.35) : mix(c2, c3, (l-0.7)/0.3);
  float dist = length(vWPos - cameraPosition);
  float near = uDetail * (1.0 - smoothstep(60.0, 1400.0, dist));
  float g = fbm(vWPos.xz * 0.9) * 0.6 + fbm(vWPos.xz * 0.11) * 0.4;
  float pebbles = smoothstep(0.62, 0.9, vnoise(vWPos.xz * 6.0)) * (1.0 - smoothstep(10.0, 120.0, dist));
  tint *= 1.0 + near * ((g - 0.5) * 0.55 - pebbles * 0.25);
  tint = mix(tint, vec3(0.52, 0.34, 0.22), uDust * 0.35);
  tint = mix(tint, vec3(0.78, 0.84, 0.90), uFrost * smoothstep(0.35, 0.8, fbm(vWPos.xz * 0.35)) * 0.55);
  diffuseColor.rgb = tint;
}`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{ // procedural micro-relief near the camera (not data)
  float dist = length(vWPos - cameraPosition);
  float near = uDetail * (1.0 - smoothstep(30.0, 900.0, dist));
  if (near > 0.001) {
    vec2 p = vWPos.xz; float e = 0.35;
    float hx = fbm((p + vec2(e, 0.0)) * 0.9) - fbm((p - vec2(e, 0.0)) * 0.9);
    float hz = fbm((p + vec2(0.0, e)) * 0.9) - fbm((p - vec2(0.0, e)) * 0.9);
    vec3 bump = normalize((viewMatrix * vec4(-hx, 0.0, -hz, 0.0)).xyz * 2.2 * near + normal);
    normal = bump;
  }
}`);
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
