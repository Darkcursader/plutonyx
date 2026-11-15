// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
/**
 * world.ts — renderer, post-processing, lighting, time of day, weather and the cinematic camera rig.
 * The world only SHOWS state; all rules live in src/sim.
 */
import * as THREE from 'three';
import { EffectComposer, RenderPass, EffectPass, BloomEffect, SMAAEffect, ToneMappingEffect, ToneMappingMode, VignetteEffect, NoiseEffect, BlendFunction, HueSaturationEffect, BrightnessContrastEffect } from 'postprocessing';
import { Terrain } from './terrain';
import { Sky } from './sky';
import { Outpost, type OutpostState } from './outpost';
import { loadGround, loadRocks, loadRover } from './assets';
// @ts-ignore — n8ao ships without type declarations
import { N8AOPostPass } from 'n8ao';

export type Quality = 'ultra' | 'high' | 'low';
export type Phase = 'dawn' | 'day' | 'sunset' | 'night';
const TOD: Record<Phase, number> = { dawn: 0.281, day: 0.355, sunset: 0.726, night: 0.93 };
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

interface Shot { pos: [number, number, number]; look: [number, number, number]; fov: number; around?: string }
const SHOTS: Record<string, Shot> = {
  title: { pos: [-150, 2.2, 118], look: [-12, 30, -150], fov: 30 },
  board: { pos: [78, 40, 58], look: [4, 3, -30], fov: 36 },
  outpost: { pos: [-62, 8, 24], look: [0, 6, -38], fov: 34 },
  wide: { pos: [-170, 34, 150], look: [0, 12, -40], fov: 30 },
  greenhouse: { pos: [-41, 4.4, -25], look: [-22, 2.2, -44], fov: 38 },
  shelter: { pos: [45, 2.6, -29], look: [20, 5, -52], fov: 34 },
  solar: { pos: [64, 5.5, 14], look: [38, 2, -8], fov: 38 },
  dish: { pos: [-49, 2.6, 3], look: [-34, 6.5, -14], fov: 34 },
  airmaker: { pos: [23, 3.6, -17], look: [10, 3.6, -30], fov: 38 },
  garage: { pos: [-21, 2.4, 3], look: [-8, 1.7, -10], fov: 36 },
  pad: { pos: [34, 4, 98], look: [0, 10, 60], fov: 36 },
  sky: { pos: [-36, 2.5, 34], look: [-10, 90, -220], fov: 52 },
  interior: { pos: [9, 5.6, -13], look: [0, 5.2, -37], fov: 26 },
  delta: { pos: [-16, 3.2, 12], look: [0, 2, 0], fov: 36, around: 'delta' },
  launch: { pos: [70, 3, 150], look: [0, 60, 60], fov: 40 },
};

export class World {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(36, 1, 0.5, 90000);
  terrain = new Terrain();
  sky = new Sky();
  outpost!: Outpost;
  quality: Quality;
  reducedMotion = false;
  photo = false;
  private composer!: EffectComposer;
  private grade!: { hue: HueSaturationEffect; bc: BrightnessContrastEffect; vig: VignetteEffect; bloom: BloomEffect };
  private sun = new THREE.DirectionalLight(0xffffff, 3);
  private hemi = new THREE.HemisphereLight(0xffffff, 0x3a2416, 1);
  private sunDir = new THREE.Vector3(0, 1, 0);
  private earthDir = new THREE.Vector3(0.45, 0.3, -0.84).normalize();
  private tod = TOD.dawn; private todFrom = TOD.dawn; private todTo = TOD.dawn; private todT = 1; private todDur = 1;
  private dust = 0; private dustTo = 0; private storm = 0; private stormTo = 0;
  private dustPts!: THREE.Points; private dustU = { uTime: { value: 0 }, uAmount: { value: 0 }, uColor: { value: new THREE.Color(0.7, 0.45, 0.28) } };
  private cam = { fromP: new THREE.Vector3(), toP: new THREE.Vector3(), fromL: new THREE.Vector3(), toL: new THREE.Vector3(), look: new THREE.Vector3(), fromF: 36, toF: 36, t: 1, dur: 1, orbit: null as null | { c: THREE.Vector3; r: number; h: number; a: number; speed: number } };
  private clock = new THREE.Clock();
  private wall!: THREE.Mesh; private wallU = { uTime: { value: 0 }, uAmount: { value: 0 }, uColor: { value: new THREE.Color(0.5, 0.3, 0.17) }, uFlash: { value: 0 } };
  private launchT = -1;
  time = 0;
  /** Shift the picture left (0..0.3 of the width) so a panel on the right never covers the subject. */
  frameShift = 0; private frameNow = 0;
  onFrame: ((dt: number) => void) | null = null;

  constructor(canvas: HTMLCanvasElement, quality?: Quality) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, stencil: false, depth: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    this.quality = quality ?? World.detectQuality(this.renderer);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.shadowMap.enabled = this.quality !== 'low';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  static detectQuality(r: THREE.WebGLRenderer): Quality {
    try {
      const gl = r.getContext();
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
      if (/swiftshader|llvmpipe|software|mali-[4t]|adreno \(tm\) [3-5]|powervr|intel.*hd graphics [2-6]|celeron|pentium/i.test(name)) return 'low';
      if (/rtx|radeon rx [6-9]|radeon pro|apple m[1-9]|arc\(tm\) a[57]/i.test(name)) return 'ultra';
      if (matchMedia('(pointer: coarse)').matches) return 'low';
    } catch { /* fall through */ }
    return 'high';
  }

  async init(base: string, onProgress: (p: number, label: string) => void) {
    const q = this.quality;
    onProgress(0.1, 'Reading the real elevation of Jezero Crater');
    await this.terrain.load(base, q === 'ultra' ? 1023 : q === 'high' ? 767 : 383, Math.min(16, this.renderer.capabilities.getMaxAnisotropy()));
    onProgress(0.6, 'Building Lakeshore Outpost');
    const aniso = Math.min(16, this.renderer.capabilities.getMaxAnisotropy());
    onProgress(0.45, 'Laying down scanned ground and rocks');
    const [ground, rocks, rover] = await Promise.all([loadGround(base, aniso).catch(() => null), loadRocks(base), loadRover(base)]);
    if (ground) this.terrain.setGround(ground);
    this.scene.add(this.terrain.mesh, this.sky.mesh);
    this.outpost = new Outpost((x, z) => this.terrain.heightAt(x, z));
    this.outpost.scatterRocks(rocks, q === 'ultra' ? 1700 : q === 'high' ? 1100 : 450);
    if (rover) this.outpost.addExplorer(rover);
    // persistent rover tracks and boot prints around the base
    const T = this.terrain; T.uniforms.uTrackRect.value.set(-128, -158, 256, 256);
    T.track([[-8, -10], [-18, -4], [-44, 1], [-80, -8], [-127, -30]]); T.track([[-8, -10], [-5, 8], [-1, 30], [0, 44]]); T.track([[-17, 1], [-30, 14], [-60, 40], [-110, 70]], 2.2, 0.4);
    for (const p of [[[0, -28.5], [-9, -33], [-15, -38.5]], [[0, -28.5], [9, -27], [10, -24]], [[1, -28.5], [12, -36], [20, -44]], [[0, -28], [14, -16], [30, -10]], [[-1, -28], [-14, -20], [-31, -13]], [[0, -28], [-5, -16], [-8, -13]]] as [number, number][][]) T.footprints(p);
    this.outpost.placeFieldRover(-6100, -2700, 2.2);
    this.outpost.fieldRover.visible = false;
    this.scene.add(this.outpost.group);

    this.sun.castShadow = q !== 'low';
    const sm = q === 'ultra' ? 4096 : 2048;
    this.sun.shadow.mapSize.set(sm, sm);
    const sc = this.sun.shadow.camera; sc.left = -78; sc.right = 78; sc.top = 78; sc.bottom = -78; sc.near = 10; sc.far = 900;
    this.sun.shadow.bias = -0.00025; this.sun.shadow.normalBias = 0.05; this.sun.shadow.radius = 2.5;
    this.envScene.add(new THREE.Mesh(this.sky.mesh.geometry, this.sky.mesh.material));
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environmentIntensity = 0.85;
    this.scene.add(this.sun, this.sun.target, this.hemi);
    this.scene.fog = new THREE.FogExp2(0xc9a27a, 0.00004);

    // drifting dust (only visible in dust storms)
    const N = q === 'low' ? 1500 : 5000, p = new Float32Array(N * 3);
    for (let i = 0; i < N * 3; i++) p[i] = Math.random();
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.dustPts = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: this.dustU, transparent: true, depthWrite: false,
      vertexShader: `uniform float uTime; varying float vA; void main(){ vec3 q = position; q.x = fract(q.x + uTime * 0.035 * (0.5 + q.y)); q.z = fract(q.z + uTime * 0.012); q.y = fract(q.y + sin(uTime * 0.2 + q.x * 9.0) * 0.02);
  vec3 w = cameraPosition + (q - 0.5) * vec3(160.0, 50.0, 160.0); vec4 mv = viewMatrix * vec4(w, 1.0); vA = smoothstep(80.0, 20.0, -mv.z) * smoothstep(0.5, 4.0, -mv.z); gl_PointSize = 260.0 / max(1.0, -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uAmount; uniform vec3 uColor; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(uColor, smoothstep(0.5, 0.0, d) * vA * uAmount * 0.16); }`,
    }));
    this.dustPts.frustumCulled = false; this.dustPts.renderOrder = 20;
    this.scene.add(this.dustPts);
    // the dust storm itself: a towering wall of dust on the eastern horizon that rolls in and swallows the base
    this.wall = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 96, 24, true, -1.25, 2.5), new THREE.ShaderMaterial({
      uniforms: this.wallU, transparent: true, depthWrite: false, side: THREE.BackSide, fog: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying vec2 vUv; uniform float uTime; uniform float uAmount; uniform vec3 uColor; uniform float uFlash;\nfloat h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\nfloat n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }\nfloat fbm(vec2 p){ float a = 0.5, s = 0.0; for(int i=0;i<5;i++){ s += a*n(p); p = p*2.07 + 9.1; a *= 0.5; } return s; }\nvoid main(){\n  vec2 q = vec2(vUv.x * 9.0, vUv.y * 2.2);\n  float billow = fbm(q + vec2(uTime * 0.012, -uTime * 0.02)) * 0.65 + fbm(q * 2.6 + vec2(-uTime * 0.02, uTime * 0.011)) * 0.35;\n  float top = 0.45 + 0.4 * fbm(vec2(vUv.x * 14.0 + uTime * 0.01, 3.0));\n  float body = smoothstep(top, top - 0.38, vUv.y) * smoothstep(0.0, 0.06, vUv.y);\n  float edge = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);\n  float a = clamp(body * (0.55 + 0.6 * billow) * edge, 0.0, 1.0) * uAmount;\n  vec3 col = uColor * (0.55 + 0.6 * billow) + vec3(0.9, 0.85, 1.0) * uFlash * smoothstep(0.55, 0.9, n(q * 3.0 + floor(uTime * 7.0))) * 0.6;\n  gl_FragColor = vec4(col, a);\n}' }));
    this.wall.frustumCulled = false; this.wall.renderOrder = 2; this.scene.add(this.wall);

    onProgress(0.85, 'Lighting the sky');
    this.composer = new EffectComposer(this.renderer, { frameBufferType: THREE.HalfFloatType, multisampling: q === 'low' ? 0 : Math.min(4, this.renderer.capabilities.maxSamples) });
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    if (q !== 'low' && !/[?&]ao=0/.test(location.search)) {
      try { // screen-space ambient occlusion: contact shadows under rocks, legs and modules
        const ao = new N8AOPostPass(this.scene, this.camera, innerWidth, innerHeight);
        ao.configuration.aoRadius = 2.2; ao.configuration.distanceFalloff = 1.2; ao.configuration.intensity = 2.6; ao.configuration.color = new THREE.Color(0.06, 0.03, 0.02);
        ao.configuration.halfRes = q !== 'ultra'; ao.setQualityMode(q === 'ultra' ? 'High' : 'Medium');
        this.composer.addPass(ao); this.ao = ao;
      } catch (e) { console.warn('ambient occlusion unavailable', e); }
    }
    const bloom = new BloomEffect({ luminanceThreshold: 1.0, luminanceSmoothing: 0.25, intensity: 0.55, mipmapBlur: true, radius: 0.72 });
    const hue = new HueSaturationEffect({ saturation: 0.04 });
    const bc = new BrightnessContrastEffect({ contrast: 0.06 });
    const vig = new VignetteEffect({ offset: 0.32, darkness: 0.5 });
    const noise = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: false }); noise.blendMode.opacity.value = 0.09;
    const tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
    this.grade = { hue, bc, vig, bloom };
    const fx = q === 'low' ? [new SMAAEffect(), tone, hue, bc, vig] : [bloom, tone, hue, bc, vig, noise, new SMAAEffect()];
    this.composer.addPass(new EffectPass(this.camera, ...fx));
    this.resize();
    addEventListener('resize', () => this.resize());
    this.jump('wide');
    this.applySun();
    onProgress(1, 'Ready');
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    const cap = this.quality === 'ultra' ? 3 : this.quality === 'high' ? 2 : 1.5;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, cap));
    this.renderer.setSize(w, h, false);
    this.composer?.setSize(w, h); this.ao?.setSize?.(w, h);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------ time of day and weather

  setPhase(p: Phase, seconds = 3) { this.todFrom = this.tod; let to = TOD[p]; if (to < this.tod - 0.001) to += 1; this.todTo = to; this.todT = 0; this.todDur = Math.max(0.01, this.reducedMotion ? 0.6 : seconds); }
  setWeather(dust: number, storm: number) { this.dustTo = dust; this.stormTo = storm; }
  setEarthDir(v: THREE.Vector3) { this.earthDir.copy(v).normalize(); this.sky.u.uEarth.value.copy(this.earthDir); }
  setOutpost(s: Omit<OutpostState, 'night' | 'dust' | 'storm'>) { this.pending = s; }
  private pending: Omit<OutpostState, 'night' | 'dust' | 'storm'> | null = null;
  private envScene = new THREE.Scene(); private pmrem!: THREE.PMREMGenerator; private envRT: THREE.WebGLRenderTarget | null = null; private envKey = ''; private envAt = -99; private ao: any = null;
  /** Image-based lighting taken from our own Mars sky, refreshed when the light changes. */
  private updateEnv() {
    const key = `${this.sunDir.y.toFixed(2)}|${this.dust.toFixed(1)}|${this.storm.toFixed(1)}`;
    if (key === this.envKey || this.time - this.envAt < 0.35) return;
    this.envKey = key; this.envAt = this.time;
    this.sky.u.uDisc.value = 0.04;
    const rt = this.pmrem.fromScene(this.envScene, 0, 1, 10);
    this.sky.u.uDisc.value = 1;
    this.scene.environment = rt.texture; this.envRT?.dispose(); this.envRT = rt;
  }
  get nightAmount() { return 1 - THREE.MathUtils.smoothstep(this.sunDir.y, -0.08, 0.2); }

  private applySun() {
    const th = (this.tod - 0.25) * Math.PI * 2, tilt = 0.42;
    this.sunDir.set(Math.cos(th), Math.sin(th) * Math.cos(tilt), Math.sin(th) * Math.sin(tilt) * -1 + 0.0).normalize();
    const e = this.sunDir.y, day = THREE.MathUtils.smoothstep(e, -0.06, 0.16), low = 1 - THREE.MathUtils.smoothstep(e, 0.02, 0.42);
    const hz = this.sky.update(this.sunDir, this.dust, this.storm, this.time);
    this.sun.color.setRGB(1.0, 0.9, 0.76).lerp(new THREE.Color(0.86, 0.86, 0.98), low * 0.6);
    this.sun.intensity = 5.2 * day * (1 - low * 0.42) * (1 - this.dust * 0.9);
    const f = this.cam.look;
    this.sun.target.position.set(0, 0, -30);
    this.sun.position.copy(this.sun.target.position).addScaledVector(e > -0.02 ? this.sunDir : new THREE.Vector3(0.3, 1, 0.2).normalize(), 420);
    void f;
    this.hemi.color.copy(hz).multiplyScalar(1.5).addScalar(0.012);
    this.hemi.groundColor.setRGB(0.3, 0.17, 0.1).multiplyScalar(0.25 + 0.75 * day);
    this.hemi.intensity = 0.16 + 0.22 * day + this.dust * 0.35;
    if (this.pmrem) this.updateEnv();
    const fog = this.scene.fog as THREE.FogExp2;
    fog.color.copy(hz); fog.density = 0.000052 + this.dust * 0.0042 + low * 0.00003;
    this.dustU.uAmount.value = this.dust; this.dustU.uColor.value.copy(hz).multiplyScalar(1.15);
    this.terrain.uniforms.uDust.value = this.dust;
    if (this.wall) { // the wall stands far off while the storm builds and closes in as the dust thickens
      const wa = Math.min(1, this.dust * 2.2) * (1 - Math.max(0, this.dust - 0.7) * 2.2);
      const R = THREE.MathUtils.lerp(5200, 900, Math.min(1, this.dust * 1.25));
      this.wall.visible = wa > 0.01; this.wall.position.set(this.camera.position.x + R * 0.25, this.terrain.heightAt(this.camera.position.x, this.camera.position.z) - 30, this.camera.position.z); this.wall.scale.set(R, 260 + R * 0.24, R);
      this.wallU.uAmount.value = wa; this.wallU.uTime.value = this.time; this.wallU.uColor.value.copy(hz).multiplyScalar(0.8); this.wallU.uFlash.value = this.dust > 0.5 && Math.sin(this.time * 1.7) > 0.96 ? 1 : 0;
    }
  }

  // ------------------------------------------------------------ camera

  private pose(name: string): { p: THREE.Vector3; l: THREE.Vector3; fov: number } {
    const s = SHOTS[name] ?? SHOTS.board;
    const o = s.around ? this.outpost.focus[s.around] : null;
    const px = s.pos[0] + (o?.x ?? 0), pz = s.pos[2] + (o?.z ?? 0), lx = s.look[0] + (o?.x ?? 0), lz = s.look[2] + (o?.z ?? 0);
    const portrait = this.camera.aspect < 1 ? 1.35 : 1;
    return { p: new THREE.Vector3(px, this.terrain.heightAt(px, pz) + s.pos[1], pz), l: new THREE.Vector3(lx, this.terrain.heightAt(lx, lz) + s.look[1], lz), fov: Math.min(75, s.fov * portrait) };
  }
  jump(name: string) { const q = this.pose(name); this.cam.orbit = null; this.cam.t = 1; this.cam.toP.copy(q.p); this.cam.toL.copy(q.l); this.cam.look.copy(q.l); this.cam.toF = q.fov; this.camera.position.copy(q.p); this.camera.fov = q.fov; this.camera.lookAt(q.l); this.camera.updateProjectionMatrix(); }
  shot(name: string, seconds = 2.2) {
    const q = this.pose(name); const c = this.cam; c.orbit = null;
    c.fromP.copy(this.camera.position); c.fromL.copy(c.look); c.fromF = this.camera.fov; c.toP.copy(q.p); c.toL.copy(q.l); c.toF = q.fov; c.t = 0; c.dur = this.reducedMotion ? 0.01 : seconds;
  }
  /** Slow orbit used by the title screen and endings. */
  orbit(center: [number, number], radius: number, height: number, speed = 0.018, startAngle = 0.6) {
    const y = this.terrain.heightAt(center[0], center[1]);
    this.cam.orbit = { c: new THREE.Vector3(center[0], y + 6, center[1]), r: radius, h: height, a: startAngle, speed };
  }
  startLaunch() { this.launchT = 0; }
  resetLaunch() { this.launchT = -1; this.outpost.launch(0); }

  /** Per-ending colour look (style-guide §7). */
  setLook(look: string) {
    const L: Record<string, [number, number, number, number]> = { // saturation, contrast, brightness, vignette
      default: [0.04, 0.06, 0, 0.5], gold: [0.14, 0.05, 0.04, 0.42], goldblue: [0.12, 0.1, 0.0, 0.55], amberteal: [0.2, 0.2, -0.02, 0.62], greenmagenta: [0.1, 0.0, 0.03, 0.45],
      bluehour: [-0.22, 0.04, -0.02, 0.55], dusty: [-0.3, -0.08, 0.0, 0.5], predawn: [-0.12, 0.12, -0.04, 0.66],
    };
    const [s, c, b, v] = L[look] ?? L.default;
    this.grade.hue.saturation = s; this.grade.bc.contrast = c; this.grade.bc.brightness = b; this.grade.vig.darkness = v;
  }

  // ------------------------------------------------------------ frame

  /** When true the world only advances through step(dt) — used to record cutscenes at an exact 30 fps. */
  manual = false;
  start() {
    const loop = () => { requestAnimationFrame(loop); const dt = Math.min(0.05, this.clock.getDelta()); if (!this.manual) this.step(dt); };
    loop();
  }
  /**
   * Keeps the game smooth on weak laptops: if the frame rate stays low, effects are switched off step by step
   * (ambient occlusion first, then extra pixels, then shadows and particles). The picture stays at native
   * sharpness on the Low step 1; nothing is ever upscaled from a tiny canvas.
   */
  degradeLevel = 0; private fpsT = 0; private fpsN = 0;
  private watchFps(dt: number) {
    if (this.manual || this.photo || document.hidden) return;
    this.fpsT += dt; this.fpsN++;
    if (this.fpsN < 150) return;
    const fps = this.fpsN / this.fpsT; this.fpsT = 0; this.fpsN = 0;
    if (fps >= 24 || this.degradeLevel >= 3) return;
    this.degradeLevel++;
    if (this.degradeLevel === 1) { if (this.ao) this.ao.enabled = false; this.grade.bloom.intensity = 0.35; }
    if (this.degradeLevel === 2) { this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1)); this.composer.setSize(innerWidth, innerHeight); this.dustPts.visible = false; }
    if (this.degradeLevel === 3) { this.sun.castShadow = false; this.renderer.shadowMap.enabled = false; this.terrain.uniforms.uDetail.value = 0.6; }
    console.info('[quality] low frame rate (' + fps.toFixed(0) + ' fps): effects step ' + this.degradeLevel);
  }
  step(dt: number) {
    {
      this.watchFps(dt);
      this.time += dt;
      if (this.todT < 1) { this.todT = Math.min(1, this.todT + dt / this.todDur); this.tod = this.todFrom + (this.todTo - this.todFrom) * ease(this.todT); if (this.todT >= 1) this.tod %= 1; }
      this.dust += (this.dustTo - this.dust) * Math.min(1, dt * 0.8);
      this.storm += (this.stormTo - this.storm) * Math.min(1, dt * 1.2);
      this.dustU.uTime.value = this.time;
      this.applySun();
      const c = this.cam;
      if (!this.photo) {
        if (c.orbit) {
          const o = c.orbit; o.a += dt * o.speed * (this.reducedMotion ? 0.25 : 1);
          const x = o.c.x + Math.cos(o.a) * o.r, z = o.c.z + Math.sin(o.a) * o.r;
          this.camera.position.set(x, Math.max(o.c.y + o.h, this.terrain.maxHeightNear(x, z, 20) + 6), z);
          c.look.copy(o.c); this.camera.lookAt(o.c);
        } else {
          if (c.t < 1) {
            c.t = Math.min(1, c.t + dt / c.dur); const k = ease(c.t);
            this.camera.position.lerpVectors(c.fromP, c.toP, k); c.look.lerpVectors(c.fromL, c.toL, k);
            this.camera.fov = c.fromF + (c.toF - c.fromF) * k; this.camera.updateProjectionMatrix();
          } else if (!this.reducedMotion) {
            const sway = 0.12 + this.storm * 0.25;
            this.camera.position.set(c.toP.x + Math.sin(this.time * 0.21) * sway, c.toP.y + Math.sin(this.time * 0.17 + 1) * sway * 0.5, c.toP.z + Math.cos(this.time * 0.19) * sway);
          }
          const minY = this.terrain.heightAt(this.camera.position.x, this.camera.position.z) + 1.4;
          if (this.camera.position.y < minY) this.camera.position.y = minY;
          this.camera.lookAt(c.look);
        }
      }
      const fs = innerWidth > 900 ? this.frameShift : 0;
      if (Math.abs(fs - this.frameNow) > 0.0005) { this.frameNow += (fs - this.frameNow) * Math.min(1, dt * 3); const w = innerWidth, h = innerHeight; if (this.frameNow < 0.001) this.camera.clearViewOffset(); else this.camera.setViewOffset(w, h, this.frameNow * w, 0, w, h); }
      if (this.launchT >= 0) { this.launchT = Math.min(1, this.launchT + dt / 16); this.outpost.launch(this.launchT); if (!c.orbit) c.look.y += dt * (this.launchT * 60); }
      if (this.pending) this.outpost.setState({ ...this.pending, night: this.nightAmount, dust: this.dust, storm: this.storm });
      this.outpost.update(this.time, this.earthDir);
      this.terrain.uniforms.uFrost.value += ((this.pending?.frost ? 1 : 0) - this.terrain.uniforms.uFrost.value) * 0.02;
      this.onFrame?.(dt);
      this.composer.render(dt);
    }
  }

  /** Full-resolution screenshot of the current frame (photo mode). */
  capture(): string { this.composer.render(0); return this.renderer.domElement.toDataURL('image/png'); }
}
