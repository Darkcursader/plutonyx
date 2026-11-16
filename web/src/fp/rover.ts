// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
/**
 * rover.ts — drive the outpost's pressurised rover in first person. Walk up to it and press [F].
 * Cockpit view from the driver's seat (live dashboard, yoke, bubble frame) or a chase camera ([C]).
 * Arcade-smooth handling with real Mars gravity (3.73 m/s²) for the suspension and the jumps,
 * dust plumes, wheel ruts, and a supply run: follow the gates to a cargo pod that landed about a
 * kilometre out, winch it aboard, bring it back to the rover pad. The cabin is pressurised, so suit
 * oxygen refills while you drive. The rover has its own battery and recharges on its pad.
 */
import * as THREE from 'three';
import type { World } from '../world/world';
import { SOLID, type FirstPerson } from './fp';

const G = 3.73, WB = 3.4, MAXV = 11, BOOSTV = 16, LOWV = 4.5;
const PAD: [number, number] = [-8, -10];
const EYE = new THREE.Vector3(1.42, 2.06, -0.34);
export interface Site { x: number; z: number; what: string; reward: string }
/** Cargo drop sites, each about a kilometre from the outpost (picked for drivable slopes). */
export const SITES: Site[] = [
  { x: 620, z: -560, what: 'seed packets and a spare air filter', reward: '+5 food, +5 water' },
  { x: -700, z: 520, what: 'water-ice canisters from the north ridge', reward: '+5 food, +5 water' },
  { x: 330, z: 900, what: 'new solar cells and plant food', reward: '+5 food, +5 water' },
];

const mat = (color: number, rough = 0.6, metal = 0.2, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
const glow = (color: number, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, fog: false });

export class RoverDrive {
  active = false;
  view: 'cockpit' | 'chase' = 'cockpit';
  battery = 100; cargo = false; site = 0; gate = 0; runT = 0; running = false;
  best = (() => { try { return Number(localStorage.getItem('plutonyx.bestRun')) || 0; } catch { return 0; } })();
  engine: (on: boolean, speed: number, rough: number) => void = () => {};
  onDeliver: (site: Site, time: number) => void = () => {};
  root = new THREE.Group();

  private rover: THREE.Group;
  private px = 0; private pz = 0; private yaw = 0; private v = 0; private steer = 0; private y = 0; private vy = 0; private air = false; private airT = 0;
  private pitch = 0; private roll = 0; private shake = 0; private rough = 0;
  private keys: Record<string, boolean> = {}; private pad: Record<number, boolean> = {};
  private cabin = new THREE.Group(); private dash: CanvasRenderingContext2D; private dashTex: THREE.CanvasTexture; private yoke = new THREE.Group();
  private wheels: THREE.Object3D[] = [];
  private pod = new THREE.Group(); private crate: THREE.Group; private podLight: THREE.Mesh; private beacon = new THREE.Group(); private gates: { g: THREE.Group; m: THREE.MeshBasicMaterial; x: number; z: number }[] = [];
  private dust: THREE.Points; private dp: Float32Array; private dv: Float32Array; private dl: Float32Array; private di = 0;
  private hud: HTMLElement; private hint: HTMLElement; private say: HTMLElement; private sayT = 0;
  private winch = 0; private dashT = 0; private trackD = 0; private chase = new THREE.Vector3(); private chaseInit = false;
  private q = new THREE.Quaternion(); private qLook = new THREE.Quaternion(); private e = new THREE.Euler();

  constructor(private world: World, private fp: FirstPerson, host: HTMLElement, private play: (s: string) => void) {
    this.rover = world.outpost.rover;
    this.rover.traverse((o) => { if ((o as THREE.Mesh).isMesh && Math.abs(o.position.y - 0.62) < 0.02) this.wheels.push(o); });
    const mk = (cls: string) => { const d = document.createElement('div'); d.className = cls; d.style.display = 'none'; host.append(d); return d; };
    this.hud = mk('rv-hud'); this.hint = mk('rv-hint'); this.say = mk('rv-say');
    this.hint.innerHTML = '<b>W</b>/<b>S</b> drive · <b>A</b>/<b>D</b> steer · <b>Shift</b> boost · <b>Space</b> brake · <b>C</b> camera · <b>F</b> get out';

    // ---- cockpit (rover-local: +x is forward, +z is the driver's right)
    const graphite = mat(0x2b2d31, 0.7, 0.3), trim = mat(0x16181b, 0.5, 0.5), offwhite = mat(0xe6e1d6, 0.55, 0.1), orange = mat(0xc8551e, 0.5, 0.2);
    const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = this.cabin) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); parent.add(me); return me; };
    add(new THREE.BoxGeometry(1.9, 0.08, 1.7), trim, 1.35, 1.26, 0);                       // floor
    const dash = add(new THREE.BoxGeometry(0.62, 0.2, 1.72), graphite, 2.02, 1.56, 0); dash.rotation.z = 0.28;
    add(new THREE.BoxGeometry(0.06, 0.03, 1.72), orange, 1.74, 1.66, 0);                    // orange trim line
    for (const z of [-0.86, 0.86]) { add(new THREE.BoxGeometry(1.5, 0.42, 0.12), graphite, 1.45, 1.45, z); add(new THREE.BoxGeometry(1.4, 0.04, 0.14), orange, 1.45, 1.67, z); }
    // live dashboard screen
    const cv = document.createElement('canvas'); cv.width = 640; cv.height = 256; this.dash = cv.getContext('2d')!;
    this.dashTex = new THREE.CanvasTexture(cv); this.dashTex.colorSpace = THREE.SRGBColorSpace; this.dashTex.anisotropy = 4;
    const scr = add(new THREE.PlaneGeometry(0.9, 0.36), new THREE.MeshBasicMaterial({ map: this.dashTex, toneMapped: false, fog: false }), 1.86, 1.72, -0.12);
    scr.rotation.set(0, -Math.PI / 2, 0, 'YXZ'); scr.rotateX(-0.95);
    // small switch panel with lit buttons
    for (let i = 0; i < 6; i++) add(new THREE.BoxGeometry(0.035, 0.02, 0.05), glow([0x5fd08a, 0xffb347, 0x58a6ff, 0xc8551e, 0x5fd08a, 0xe6e1d6][i]), 1.9 + (i % 2) * 0.06, 1.69, 0.32 + Math.floor(i / 2) * 0.1);
    // yoke
    this.yoke.position.set(1.78, 1.62, EYE.z); this.cabin.add(this.yoke);
    add(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 10).rotateZ(Math.PI / 2), trim, 0.1, -0.02, 0, this.yoke);
    const wheel = add(new THREE.TorusGeometry(0.17, 0.022, 10, 36, Math.PI * 1.3).rotateY(Math.PI / 2), offwhite, 0, 0, 0, this.yoke); wheel.rotation.x = -Math.PI * 0.15 - Math.PI / 2;
    add(new THREE.BoxGeometry(0.03, 0.05, 0.3), graphite, 0, 0, 0, this.yoke);
    add(new THREE.BoxGeometry(0.02, 0.03, 0.04), glow(0xc8551e), -0.01, 0.03, 0, this.yoke);
    // bubble frame: two pillars over the top and a sill
    const frameM = mat(0x1e2024, 0.45, 0.6);
    for (const z of [-0.5, 0.5]) { const r = Math.sqrt(0.95 * 0.95 - z * z); add(new THREE.TorusGeometry(r, 0.035, 8, 40, Math.PI).rotateZ(-Math.PI / 2), frameM, 2.15, 1.85, z); }
    add(new THREE.TorusGeometry(0.93, 0.04, 8, 48, Math.PI).rotateX(Math.PI / 2).rotateY(Math.PI / 2), frameM, 2.15, 1.5, 0);
    add(new THREE.TorusGeometry(0.93, 0.03, 8, 48, Math.PI).rotateX(Math.PI / 2).rotateY(Math.PI / 2), frameM, 2.15, 2.62, 0).scale.set(0.55, 1, 0.55);
    // faint glass tint so you feel the bubble
    const glass = new THREE.Mesh(new THREE.SphereGeometry(0.97, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2).rotateZ(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x9fc4d8, transparent: true, opacity: 0.045, side: THREE.BackSide, depthWrite: false }));
    glass.position.set(2.15, 1.85, 0); this.cabin.add(glass);
    this.cabin.visible = false; this.rover.add(this.cabin);

    // ---- cargo pod (landed capsule, parachute on the ground, crate inside, blinking light)
    const body = add(new THREE.CylinderGeometry(1.0, 1.5, 1.7, 32), offwhite, 0, 0.95, 0, this.pod); body.rotation.z = 0.35;
    add(new THREE.CylinderGeometry(1.52, 1.52, 0.18, 32), orange, -0.3, 0.2, 0, this.pod).rotation.z = 0.35;
    const chute = add(new THREE.SphereGeometry(4.2, 32, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xd9683a, 0.9, 0, { side: THREE.DoubleSide }), 6.5, 0.05, 1.5, this.pod); chute.scale.y = 0.06;
    for (const s of [-1, 1]) { const l = add(new THREE.CylinderGeometry(0.01, 0.01, 5.5, 4).rotateZ(Math.PI / 2), trim, 3.6, 0.3, s * 0.9, this.pod); l.rotation.y = s * 0.2; }
    this.crate = new THREE.Group();
    add(new THREE.BoxGeometry(1.3, 0.8, 0.9), offwhite, 0, 0, 0, this.crate);
    for (const x of [-0.45, 0.45]) add(new THREE.BoxGeometry(0.1, 0.82, 0.92), orange, x, 0, 0, this.crate);
    add(new THREE.BoxGeometry(0.3, 0.06, 0.05), graphite, 0, 0.43, 0, this.crate);
    this.crate.position.set(1.7, 0.42, 0); this.pod.add(this.crate);
    this.podLight = add(new THREE.SphereGeometry(0.16, 12, 8), glow(0xff8a3d), -0.2, 1.95, 0, this.pod);
    this.root.add(this.pod);
    // target beacon: a tall pillar of light you can see from far away
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 420, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xff7a30, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    beam.position.y = 210; this.beacon.add(beam);
    const ring = new THREE.Mesh(new THREE.RingGeometry(7.5, 8.2, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffa060, transparent: true, opacity: 0.7, depthWrite: false, fog: false }));
    ring.position.y = 0.15; this.beacon.add(ring); this.root.add(this.beacon);

    // ---- dust plume
    const N = 260; this.dp = new Float32Array(N * 3); this.dv = new Float32Array(N * 3); this.dl = new Float32Array(N).fill(1);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(this.dp, 3)); geo.setAttribute('aLife', new THREE.BufferAttribute(this.dl, 1));
    this.dust = new THREE.Points(geo, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      vertexShader: 'attribute float aLife; varying float vA; void main(){ vA = (1.0 - aLife) * smoothstep(0.0, 0.08, aLife); vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = (90.0 + 520.0 * aLife) / -mv.z; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(0.74, 0.55, 0.41, smoothstep(0.5, 0.0, d) * vA * 0.42); }',
    }));
    this.dust.frustumCulled = false; this.root.add(this.dust);
    this.root.visible = false; world.scene.add(this.root);
    this.placeSite();

    addEventListener('keydown', (e) => {
      if (!this.fp.active) return; this.keys[e.code] = true;
      if (e.code === 'KeyF') this.toggle();
      if (e.code === 'KeyC' && this.active) { this.view = this.view === 'cockpit' ? 'chase' : 'cockpit'; this.chaseInit = false; this.play('up'); }
    });
    addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    addEventListener('blur', () => { this.keys = {}; });
  }

  /** FP mode on/off: the gates, pod and beacon exist only in first person. */
  setOn(on: boolean) { this.root.visible = on; if (!on && this.active) this.exit(true); }
  private get available() { return this.rover.visible || this.active; }
  canEnter() { return !this.active && this.fp.zone === 'outside' && this.available && !this.fp.tablet.raised && Math.hypot(this.fp.pos.x - this.rover.position.x, this.fp.pos.z - this.rover.position.z) < 5.2; }
  prompt() { if (this.canEnter()) return '[F] Drive the rover'; if (!this.rover.visible && this.fp.zone === 'outside' && Math.hypot(this.fp.pos.x - PAD[0], this.fp.pos.z - PAD[1]) < 6) return 'The rover is out in the field with Dil'; return ''; }
  toggle() { if (this.active) this.exit(); else if (this.canEnter()) this.enter(); }

  enter() {
    this.active = true; this.fp.driver = (dt) => this.drive(dt); this.fp.beforeTeleport = () => this.exit(true);
    this.px = this.rover.position.x; this.pz = this.rover.position.z; this.yaw = this.rover.rotation.y; this.v = 0; this.steer = 0; this.vy = 0; this.air = false;
    this.y = this.groundY().gy; this.fp.yaw = 0; this.fp.pitch = -0.05; this.view = 'cockpit'; this.chaseInit = false;
    this.cabin.visible = true; this.hud.style.display = ''; this.hint.style.display = ''; this.hint.classList.remove('fade'); setTimeout(() => this.hint.classList.add('fade'), 9000);
    document.body.classList.add('driving'); this.play('choose');
    this.tell(this.cargo ? 'Bring the cargo home to the rover pad' : `Supply run: follow the gates to the cargo pod, ${Math.round(this.distTo(SITES[this.site]))} m away`);
  }
  exit(force = false) {
    if (!this.active) return;
    if (!force && Math.abs(this.v) > 2) { this.tell('Stop the rover first (Space brakes)'); this.play('deny'); return; }
    this.active = false; this.fp.driver = null; this.fp.beforeTeleport = null; this.v = 0;
    this.cabin.visible = false; this.hud.style.display = 'none'; this.hint.style.display = 'none'; document.body.classList.remove('driving');
    this.engine(false, 0, 0);
    if (!force) { // climb out on the driver's side
      const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
      this.fp.pos.set(this.px + s * -2.9 + c * 0.6, 0, this.pz + c * -2.9 - s * 0.6); this.fp.pos.y = this.world.terrain.heightAt(this.fp.pos.x, this.fp.pos.z);
      this.fp.yaw = this.yaw + Math.PI / 2; this.fp.pitch = 0; this.play('down');
    }
    const cam = this.world.camera; cam.fov = 64; cam.updateProjectionMatrix();
  }
  /** Overnight the crew parks the rover back on its pad and charges it. */
  park() { if (this.active) return; this.rover.position.set(PAD[0], this.world.terrain.heightAt(PAD[0], PAD[1]) + 0.1, PAD[1]); this.rover.rotation.set(0, 0.6, 0); this.battery = 100; }

  private distTo(s: { x: number; z: number }) { return Math.hypot(s.x - this.px, s.z - this.pz); }
  private tell(t: string, ms = 3600) { this.say.textContent = t; this.say.style.display = ''; this.say.classList.add('on'); this.sayT = ms / 1000; }

  private placeSite() {
    const s = SITES[this.site], h = (x: number, z: number) => this.world.terrain.heightAt(x, z);
    this.pod.position.set(s.x, h(s.x, s.z), s.z); this.pod.rotation.y = this.site * 1.7;
    if (this.crate.parent !== this.pod) { this.pod.add(this.crate); this.crate.position.set(1.7, 0.42, 0); this.crate.rotation.set(0, 0, 0); }
    for (const g of this.gates) { this.root.remove(g.g); g.g.traverse((o) => (o as THREE.Mesh).geometry?.dispose()); }
    this.gates = [];
    const n = 8, dx = s.x - PAD[0], dz = s.z - PAD[1], len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len;
    const post = mat(0x2b2d31, 0.6, 0.4);
    for (let i = 0; i < n; i++) {
      const t = (i + 1) / (n + 1), off = Math.sin(i * 1.9 + this.site) * 38 * Math.sin(Math.PI * t);
      const x = PAD[0] + dx * t - uz * off, z = PAD[1] + dz * t + ux * off;
      const g = new THREE.Group(), m = glow(0xff8a3d);
      for (const zz of [-6.5, 6.5]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 5.2, 10), post); p.position.set(0, 2.6, zz); g.add(p); const l = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), m); l.position.set(0, 5.4, zz); g.add(l); }
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 13.2), m); bar.position.y = 5.2; g.add(bar);
      const num = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.9, 1.6), post); num.position.y = 5.9; g.add(num);
      g.position.set(x, h(x, z) - 0.1, z); g.rotation.y = Math.atan2(-uz, ux);
      this.root.add(g); this.gates.push({ g, m, x, z });
    }
    this.gate = 0;
  }

  private groundY() {
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw), h = (lx: number, lz: number) => this.world.terrain.heightAt(this.px + c * lx + s * lz, this.pz - s * lx + c * lz);
    const fl = h(1.7, -1.35), fr = h(1.7, 1.35), rl = h(-1.7, -1.35), rr = h(-1.7, 1.35);
    return { gy: (fl + fr + rl + rr) / 4 + 0.1, pitch: Math.atan2((fl + fr) / 2 - (rl + rr) / 2, WB), roll: -Math.atan2((fr + rr) / 2 - (fl + rl) / 2, 2.7) };
  }

  /** Called every frame by the first-person controller while you are in the driver's seat. */
  private drive(dt: number) {
    if (!(dt > 0.0005)) return; dt = Math.min(dt, 0.05);
    if (!Number.isFinite(this.px + this.pz + this.y + this.vy + this.v)) { this.px = PAD[0]; this.pz = PAD[1]; this.v = 0; this.vy = 0; this.air = false; this.y = this.groundY().gy; }
    const k = this.keys, raised = this.fp.tablet.raised;
    const gp = (navigator.getGamepads?.() ?? []).find((p) => p && p.connected);
    let thr = 0, st = 0, brake = !!k.Space, boost = !!k.ShiftLeft || !!k.ShiftRight;
    if (!raised) {
      if (k.KeyW || k.ArrowUp) thr += 1; if (k.KeyS || k.ArrowDown) thr -= 1;
      if (k.KeyA || k.ArrowLeft) st += 1; if (k.KeyD || k.ArrowRight) st -= 1;
      if (gp) {
        const dz = (v: number) => (Math.abs(v) < 0.15 ? 0 : v);
        thr += (gp.buttons[7]?.value ?? 0) - (gp.buttons[6]?.value ?? 0) - dz(gp.axes[1] ?? 0) * 0.0; st -= dz(gp.axes[0] ?? 0);
        brake = brake || !!gp.buttons[0]?.pressed; boost = boost || !!gp.buttons[5]?.pressed;
        this.fp.yaw -= dz(gp.axes[2] ?? 0) * dt * 2; this.fp.pitch -= dz(gp.axes[3] ?? 0) * dt * 1.5;
        const now = !!gp.buttons[1]?.pressed; if (now && !this.pad[1]) this.exit(); this.pad[1] = now;
        const c = !!gp.buttons[8]?.pressed; if (c && !this.pad[8]) { this.view = this.view === 'cockpit' ? 'chase' : 'cockpit'; this.chaseInit = false; } this.pad[8] = c;
        k.PadE = !!gp.buttons[2]?.pressed;
      }
    }
    thr = THREE.MathUtils.clamp(thr, -1, 1); st = THREE.MathUtils.clamp(st, -1, 1);
    if (this.battery <= 0) thr = 0;
    const low = this.battery < 15, top = low ? LOWV : boost ? BOOSTV : MAXV;
    // longitudinal
    let v = this.v;
    if (!this.air) {
      if (thr > 0) v += (v < 0 ? 10 : (boost && !low ? 7.5 : 5.2) * (1 - Math.max(0, v) / (top + 0.01) * 0.55)) * thr * dt;
      else if (thr < 0) v += (v > 0 ? 10 : 3.2) * thr * dt;
      else v -= Math.sign(v) * Math.min(Math.abs(v), (0.9 + Math.abs(v) * 0.08) * dt);
      if (brake) v -= Math.sign(v) * Math.min(Math.abs(v), 13 * dt);
      v -= G * Math.sin(this.pitch) * dt * 0.85;
    }
    v = THREE.MathUtils.clamp(v, -5, Math.max(top, Math.min(v, BOOSTV + 4)));
    if (v > top) v -= (v - top) * dt * 1.2;
    this.v = v;
    // steering: sharper when slow, gentle at speed, a little drift when you brake hard in a turn
    const maxSt = 0.6 / (1 + Math.abs(v) / 7);
    this.steer += (st * maxSt - this.steer) * Math.min(1, dt * 5);
    if (!this.air) this.yaw += (v * Math.tan(this.steer) / WB) * dt * (brake && Math.abs(v) > 6 ? 1.35 : 1);
    const fx = Math.cos(this.yaw), fz = -Math.sin(this.yaw);
    let nx = this.px + fx * v * dt, nz = this.pz + fz * v * dt;
    // buildings
    for (const [cx, cz, r] of SOLID) { if (Math.hypot(cx - PAD[0], cz - PAD[1]) < 3) continue; // the rover's own parking spot
      const d = Math.hypot(nx - cx, nz - cz), rr = r + 2.5; if (d < rr && d > 0.01) { nx = cx + ((nx - cx) / d) * rr; nz = cz + ((nz - cz) / d) * rr; if (Math.abs(this.v) > 2.5) { this.shake = Math.min(1, Math.abs(this.v) * 0.08); this.play('step'); } this.v *= -0.25; } }
    const R = 1700, dc = Math.hypot(nx, nz); if (dc > R) { nx *= R / dc; nz *= R / dc; this.v *= 0.6; this.tell('That is as far as the rover\'s radio reaches. Turn back.'); }
    const moved = Math.hypot(nx - this.px, nz - this.pz); this.px = nx; this.pz = nz;
    // suspension and air time under Mars gravity
    const g = this.groundY();
    if (this.air) {
      this.vy -= G * dt; this.y += this.vy * dt; this.airT += dt;
      if (this.y <= g.gy) { const hit = -this.vy; this.air = false; this.y = g.gy; if (hit > 1.4) { this.shake = Math.min(1, hit * 0.14); this.play('step'); if (this.airT > 0.6) this.tell(`Air time ${this.airT.toFixed(1)} s · on Mars you fall slowly!`, 1800); } this.vy = 0; }
    } else {
      const vyg = (g.gy - this.y) / dt;
      if (vyg < this.vy - G * dt * 1.6 && Math.abs(v) > 5) { this.air = true; this.airT = 0; this.vy -= G * dt; this.y += this.vy * dt; }
      else { this.vy = THREE.MathUtils.lerp(this.vy, vyg, 0.5); this.y = g.gy; }
    }
    const lean = this.air ? 0.02 : 1;
    this.pitch += (g.pitch - this.pitch) * Math.min(1, dt * 7 * lean); this.roll += (g.roll + this.steer * v * 0.006 - this.roll) * Math.min(1, dt * 6 * lean);
    this.rough = THREE.MathUtils.lerp(this.rough, Math.min(1, Math.abs(g.pitch - this.pitch) * 8 + Math.abs(v) * 0.01), 0.1);
    const r = this.rover; r.visible = true;
    r.position.set(this.px, this.y, this.pz); r.rotation.set(this.roll, this.yaw, this.pitch, 'YZX');
    for (const w of this.wheels) w.rotation.z -= (v * dt) / 0.62;
    this.yoke.rotation.x = -this.steer * 2.2;
    // battery: drains with speed, charges on the pad
    const onPad = Math.hypot(this.px - PAD[0], this.pz - PAD[1]) < 6;
    this.battery = THREE.MathUtils.clamp(this.battery - (Math.abs(v) / MAXV) * (boost ? 0.32 : 0.17) * dt + (onPad ? 6 * dt : 0), 0, 100);
    // ruts and dust
    if (!this.air && moved > 0) { this.trackD += moved; if (this.trackD > 0.35) { this.trackD = 0; for (const s of [-1, 1]) this.world.terrain.stamp(this.px - fx * 1.7 + -fz * s * 1.35, this.pz - fz * 1.7 + fx * s * 1.35, 0.34, 0.55); } }
    if (!this.air && Math.abs(v) > 1.2) this.emitDust(dt, fx, fz, v);
    // camera
    this.camera(dt, fx, fz);
    this.engine(true, Math.abs(v) / BOOSTV, this.air ? 0 : this.rough);
    // mission of the supply run
    this.run(dt, onPad);
  }

  private emitDust(dt: number, fx: number, fz: number, v: number) {
    const n = Math.min(6, Math.abs(v) * dt * 7 + Math.random()), N = this.dl.length;
    for (let i = 0; i < n; i++) {
      const j = this.di = (this.di + 1) % N, s = Math.random() < 0.5 ? -1 : 1, back = v > 0 ? -1 : 1;
      this.dp[j * 3] = this.px + fx * 1.7 * back - fz * s * 1.35 + (Math.random() - 0.5) * 0.4; this.dp[j * 3 + 1] = this.y + 0.2; this.dp[j * 3 + 2] = this.pz + fz * 1.7 * back + fx * s * 1.35 + (Math.random() - 0.5) * 0.4;
      this.dv[j * 3] = fx * back * Math.abs(v) * 0.18 + (Math.random() - 0.5) * 1.2; this.dv[j * 3 + 1] = 0.6 + Math.random() * 1.4 * Math.min(1, Math.abs(v) / 8); this.dv[j * 3 + 2] = fz * back * Math.abs(v) * 0.18 + (Math.random() - 0.5) * 1.2;
      this.dl[j] = 0;
    }
  }

  private camera(dt: number, fx: number, fz: number) {
    const cam = this.world.camera, r = this.rover, sp = Math.abs(this.v);
    this.shake = Math.max(0, this.shake - dt * 1.6);
    const jit = (this.shake * 0.06 + this.rough * 0.012 * Math.min(1, sp / 6)) * (this.world.reducedMotion ? 0.2 : 1);
    if (this.view === 'cockpit') {
      this.fp.yaw = THREE.MathUtils.clamp(this.fp.yaw, -2.2, 2.2); this.fp.pitch = THREE.MathUtils.clamp(this.fp.pitch, -0.9, 0.6);
      r.updateMatrixWorld(true);
      cam.position.copy(EYE).applyMatrix4(r.matrixWorld); cam.position.x += (Math.random() - 0.5) * jit; cam.position.y += (Math.random() - 0.5) * jit;
      r.getWorldQuaternion(this.q); this.qLook.setFromEuler(this.e.set(this.fp.pitch, -Math.PI / 2 + this.fp.yaw, 0, 'YXZ'));
      cam.quaternion.copy(this.q).multiply(this.qLook);
      cam.fov = THREE.MathUtils.lerp(cam.fov, 68 + Math.min(1, sp / BOOSTV) * 14, Math.min(1, dt * 3));
    } else {
      const want = new THREE.Vector3(this.px - fx * 10.5, this.y + 4.2, this.pz - fz * 10.5);
      want.y = Math.max(want.y, this.world.terrain.heightAt(want.x, want.z) + 1.5);
      if (!this.chaseInit) { this.chase.copy(want); this.chaseInit = true; } else this.chase.lerp(want, Math.min(1, dt * 4));
      cam.position.copy(this.chase); cam.position.y += (Math.random() - 0.5) * jit;
      cam.lookAt(this.px + fx * 5, this.y + 1.6, this.pz + fz * 5);
      cam.fov = THREE.MathUtils.lerp(cam.fov, 60 + Math.min(1, sp / BOOSTV) * 12, Math.min(1, dt * 3));
    }
    cam.updateProjectionMatrix();
  }

  private run(dt: number, onPad: boolean) {
    const s = SITES[this.site], k = this.keys;
    if (!this.running && !this.cargo && !onPad && Math.hypot(this.px - PAD[0], this.pz - PAD[1]) > 12) { this.running = true; this.runT = 0; }
    if (this.running) this.runT += dt;
    // gates on the way out
    const gt = this.gates[this.gate];
    if (!this.cargo && gt && Math.hypot(this.px - gt.x, this.pz - gt.z) < 7.5) { gt.m.color.set(0x5fd08a); this.gate++; this.play('up'); this.tell(`Gate ${this.gate} of ${this.gates.length}`, 1300); }
    // winch the cargo aboard
    let prompt = '';
    if (!this.cargo && this.distTo(s) < 11) {
      if (Math.abs(this.v) > 2.5) prompt = 'Slow down to pick up the cargo';
      else { prompt = 'Hold [E] · Winch the cargo aboard'; if (k.KeyE || k.PadE) { this.winch += dt; if (this.winch > 2.4) { this.cargo = true; this.winch = 0; this.rover.add(this.crate); this.crate.position.set(-1.85, 2.78, 0); this.crate.rotation.set(0, 0, 0); this.play('good'); this.tell(`Got it: ${s.what}. Now drive it home to the rover pad!`, 4500); } } else this.winch = Math.max(0, this.winch - dt); }
    }
    if (this.cargo && onPad) {
      if (Math.abs(this.v) > 3) prompt = 'Slow down on the pad to unload';
      else { this.cargo = false; this.running = false; const t = this.runT; const best = !this.best || t < this.best; if (best) { this.best = t; try { localStorage.setItem('plutonyx.bestRun', String(t)); } catch { /* private mode */ } } this.rover.remove(this.crate); this.onDeliver(s, t); this.tell(`Delivered in ${fmt(t)}${best ? ' · NEW BEST!' : ` · best ${fmt(this.best)}`}`, 5000); this.site = (this.site + 1) % SITES.length; this.placeSite(); }
    }
    this.fp.drivePrompt = prompt + (prompt && this.winch > 0 ? ` ${Math.round((this.winch / 2.4) * 100)}%` : '');
  }

  /** Every frame in first-person mode (driving or not): beacon, pod light, dust, HUD, dashboard. */
  frame(dt: number, time: number) {
    if (!this.root.visible) return;
    const s = SITES[this.site], tgt = this.cargo ? { x: PAD[0], z: PAD[1] } : s;
    this.beacon.position.set(tgt.x, this.world.terrain.heightAt(tgt.x, tgt.z), tgt.z);
    this.beacon.visible = this.active || this.cargo;
    this.pod.visible = true; (this.podLight.material as THREE.MeshBasicMaterial).color.setHex(Math.sin(time * 5) > 0 ? 0xff8a3d : 0x301408);
    // dust particles
    const N = this.dl.length; let alive = false;
    for (let i = 0; i < N; i++) { if (this.dl[i] >= 1) continue; alive = true; this.dl[i] = Math.min(1, this.dl[i] + dt / 3.2); const d = 1 - dt * 0.9; this.dv[i * 3] *= d; this.dv[i * 3 + 2] *= d; this.dv[i * 3 + 1] -= G * 0.12 * dt; for (let a = 0; a < 3; a++) this.dp[i * 3 + a] += this.dv[i * 3 + a] * dt; }
    if (alive || this.active) { this.dust.geometry.attributes.position.needsUpdate = true; this.dust.geometry.attributes.aLife.needsUpdate = true; }
    if (this.sayT > 0) { this.sayT -= dt; if (this.sayT <= 0) this.say.classList.remove('on'); }
    if (!this.active) return;
    this.dashT -= dt; if (this.dashT > 0) return; this.dashT = 1 / 12;
    const dist = Math.round(this.distTo(tgt)), fx = Math.cos(this.yaw), fz = -Math.sin(this.yaw), tx = tgt.x - this.px, tz = tgt.z - this.pz;
    const rel = Math.atan2(fx * tz - fz * tx, fx * tx + fz * tz), kmh = Math.abs(this.v) * 3.6;
    this.hud.innerHTML = `<b>${this.cargo ? 'RETURN TO BASE' : 'SUPPLY RUN'}</b><span>${this.cargo ? 'Cargo aboard · rover pad' : `Gate ${Math.min(this.gate + 1, this.gates.length)}/${this.gates.length} · cargo pod`} ${dist} m</span>${this.running ? `<em>${fmt(this.runT)}${this.best ? ` · best ${fmt(this.best)}` : ''}</em>` : ''}`;
    // dashboard canvas
    const c = this.dash, W = 640, H = 256;
    c.fillStyle = '#0a0d11'; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(230,225,214,.06)'; c.lineWidth = 1; for (let x = 0; x < W; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
    c.fillStyle = '#c8551e'; c.fillRect(0, 0, W, 6);
    c.textAlign = 'left'; c.fillStyle = '#e6e1d6'; c.font = '700 92px system-ui, sans-serif'; c.fillText(String(Math.round(kmh)).padStart(2, '0'), 24, 120);
    c.font = '600 20px system-ui, sans-serif'; c.fillStyle = '#8f949b'; c.fillText(this.v < -0.2 ? 'KM/H · REVERSE' : 'KM/H', 28, 150);
    if ((this.keys.ShiftLeft || this.keys.ShiftRight) && this.battery >= 15) { c.fillStyle = '#ffb347'; c.fillText('BOOST', 28, 180); }
    if (this.air) { c.fillStyle = '#58a6ff'; c.fillText('AIRBORNE', 28, 208); }
    // compass tape and target arrow
    const head = ((Math.atan2(fx, -fz) * 180) / Math.PI + 360) % 360;
    c.save(); c.beginPath(); c.rect(220, 20, 220, 40); c.clip(); c.textAlign = 'center'; c.font = '600 18px system-ui, sans-serif';
    for (let d = -60; d <= 60; d += 15) { const hd = Math.round((head + d) / 15) * 15, x = 330 + (hd - head) * 1.8; const lab = ({ 0: 'N', 90: 'E', 180: 'S', 270: 'W', 360: 'N' } as Record<number, string>)[((hd % 360) + 360) % 360]; c.fillStyle = lab ? '#e6e1d6' : '#5b6068'; c.fillText(lab ?? '|', x, 46); }
    c.restore(); c.fillStyle = '#c8551e'; c.fillRect(329, 56, 2, 8);
    c.save(); c.translate(330, 140); c.rotate(rel); c.fillStyle = '#ff8a3d'; c.beginPath(); c.moveTo(0, -46); c.lineTo(26, 16); c.lineTo(0, 4); c.lineTo(-26, 16); c.closePath(); c.fill(); c.restore();
    c.textAlign = 'center'; c.fillStyle = '#e6e1d6'; c.font = '700 26px system-ui, sans-serif'; c.fillText(`${dist} m`, 330, 205); c.font = '600 15px system-ui, sans-serif'; c.fillStyle = '#8f949b'; c.fillText(this.cargo ? 'ROVER PAD' : 'CARGO POD', 330, 228);
    // battery, tilt, cargo
    c.textAlign = 'left'; c.font = '600 16px system-ui, sans-serif'; c.fillStyle = '#8f949b'; c.fillText('BATTERY', 470, 40);
    c.strokeStyle = '#5b6068'; c.strokeRect(470, 50, 146, 26); c.fillStyle = this.battery < 15 ? '#ff5d5d' : this.battery < 35 ? '#ffb347' : '#5fd08a'; c.fillRect(473, 53, 140 * (this.battery / 100), 20);
    c.fillStyle = '#e6e1d6'; c.font = '700 20px system-ui, sans-serif'; c.fillText(`${Math.round(this.battery)}%${this.battery < 15 ? ' ECO' : ''}`, 470, 102);
    const tilt = Math.round((Math.abs(this.pitch) * 180) / Math.PI), roll = Math.round((Math.abs(this.roll) * 180) / Math.PI);
    c.font = '600 16px system-ui, sans-serif'; c.fillStyle = tilt > 20 || roll > 20 ? '#ffb347' : '#8f949b'; c.fillText(`TILT ${tilt}°  ROLL ${roll}°`, 470, 138);
    c.fillStyle = '#8f949b'; c.fillText('CABIN', 470, 172); c.fillStyle = '#5fd08a'; c.fillText('PRESSURISED', 530, 172);
    c.fillStyle = '#8f949b'; c.fillText('CARGO', 470, 200); c.fillStyle = this.cargo ? '#ffb347' : '#5b6068'; c.fillText(this.cargo ? 'LOADED' : 'EMPTY', 530, 200);
    c.fillStyle = '#8f949b'; c.fillText('G 3.73 m/s²', 470, 228);
    this.dashTex.needsUpdate = true;
  }
}

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
