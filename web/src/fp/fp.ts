// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
/**
 * fp.ts — first-person astronaut. Mouse look (pointer lock) + WASD or gamepad, Mars gravity for jumps
 * (3.73 m/s², Mars Fact Sheet), helmet visor, suit oxygen, footprints, stations you walk up to and
 * use with [E], guidance for younger players, and the hand-held tablet that carries every decision.
 * The mission rules are unchanged: this file only changes HOW the player reaches each decision.
 */
import * as THREE from 'three';
import type { World } from '../world/world';
import { Tablet } from './tablet';

export interface Station { id: string; x: number; z: number; r: number; label: string; zone?: string; y?: number }
interface Zone { id: string; cx: number; cz: number; floor: number; radius?: number; box?: [number, number, number, number]; exit: [number, number] }

const MARS_G = 3.73, EYE = 1.68, WALK = 3.1, RUN = 5.2, JUMP = 2.6;
/** Buildings you cannot walk through, as circles [x, z, radius]. */
export const SOLID: [number, number, number][] = [[0, -38, 6.4], [0, -31.6, 2.2], [9.6, -39, 2.6], [12.5, -39, 2.8], [15.6, -39, 2.8], [20, -52, 7.6], [-34, -14, 1.7], [10, -30, 3.2], [-8, -10, 2.6], [0, 60, 4.2], [-17, 1, 1.9]];

export class FirstPerson {
  active = false;
  tablet: Tablet;
  pos = new THREE.Vector3(0, 0, -24);
  yaw = Math.PI; pitch = 0;
  o2 = 100; zone = 'outside';
  cadet = true;
  stations: Station[] = [];
  private vy = 0; private grounded = true; private keys: Record<string, boolean> = {};
  private stride = 0; private side = 1; private bob = 0;
  private target: Station | null = null; private onUse: (() => void) | null = null; private hold: { need: number; done: number; cb: () => void } | null = null;
  private beacon: THREE.Group; private zones: Record<string, Zone> = {};
  private el: { visor: HTMLElement; prompt: HTMLElement; guide: HTMLElement; wrist: HTMLElement; objective: HTMLElement; fade: HTMLElement; ring: HTMLElement };
  private locked = false; private pad: Record<number, boolean> = {};
  private breathT = 0;
  onO2Empty: () => void = () => {};
  onPause: () => void = () => {};
  dose = 0; storm = 0; doseRate = 0;
  /** Set by the rover while you drive: it moves the camera instead of the walking code. */
  driver: ((dt: number) => void) | null = null;
  beforeTeleport: (() => void) | null = null;
  drivePrompt = '';
  extraPrompt: () => string = () => '';

  constructor(private world: World, private host: HTMLElement, private play: (sound: string) => void, hands: THREE.Object3D | null) {
    const mk = (cls: string) => { const d = document.createElement('div'); d.className = cls; host.append(d); return d; };
    this.el = { visor: mk('fp-visor'), prompt: mk('fp-prompt'), guide: mk('fp-guide'), wrist: mk('fp-wrist'), objective: mk('fp-objective'), fade: mk('fp-fade'), ring: mk('fp-ring') };
    this.el.visor.innerHTML = '<div class="fp-dust"></div><div class="fp-frost"></div><svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M0 0H100V100H0Z M2.5 7 Q50 -3 97.5 7 Q101 50 97.5 94 Q50 103 2.5 94 Q-1 50 2.5 7Z" fill="#06080b" fill-rule="evenodd"/><path d="M2.5 7 Q50 -3 97.5 7 Q101 50 97.5 94 Q50 103 2.5 94 Q-1 50 2.5 7Z" fill="none" stroke="rgba(255,255,255,.10)" stroke-width=".35"/></svg>';
    world.scene.add(world.camera); // so things held in front of the helmet (the tablet) are drawn
    this.tablet = new Tablet(world.camera, host, hands);
    // objective beacon: a soft pillar of light over the place you need to go
    this.beacon = new THREE.Group();
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 26, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xc8551e, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.y = 13; this.beacon.add(beam);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.05, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffa060, transparent: true, opacity: 0.8, depthWrite: false }));
    ring.position.y = 0.06; this.beacon.add(ring); this.beacon.visible = false; world.scene.add(this.beacon);
    for (const el of Object.values(this.el)) el.style.display = 'none';

    addEventListener('keydown', (e) => { if (!this.active) return; this.keys[e.code] = true; if (e.code === 'Tab') { e.preventDefault(); this.toggleTablet(); } if (e.code === 'KeyE' && !this.tablet.raised && !this.driver) this.use(); if (e.code === 'Space' && !this.tablet.raised && !this.driver) { e.preventDefault(); this.jump(); } });
    addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    addEventListener('blur', () => { this.keys = {}; });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === world.renderer.domElement; });
    world.renderer.domElement.addEventListener('click', () => { if (!this.active) return; if (this.tablet.raised && !this.tabletLocked) this.toggleTablet(false); this.lock(); });
    addEventListener('mousemove', (e) => { if (!this.active || !this.locked || this.tablet.raised) return; this.yaw -= e.movementX * 0.0022; this.pitch = THREE.MathUtils.clamp(this.pitch - e.movementY * 0.0022, -1.35, 1.35); });
  }

  /** While a decision panel is open the tablet cannot be put away. */
  tabletLocked = false;
  private lock() { try { void (this.world.renderer.domElement.requestPointerLock() as any)?.catch?.(() => {}); } catch { /* not allowed yet */ } }
  toggleTablet(on = !this.tablet.raised) {
    if (!on && this.tabletLocked) return;
    this.tablet.raise(on); this.play(on ? 'up' : 'down');
    if (on) document.exitPointerLock?.(); else this.lock();
  }

  addZone(z: Zone) { this.zones[z.id] = z; }
  floorY(x = this.pos.x, z = this.pos.z) { const zn = this.zones[this.zone]; return zn ? zn.floor : this.world.terrain.heightAt(x, z); }

  enable(cadet: boolean) {
    this.active = true; this.cadet = cadet; this.world.external = true; this.world.frameShift = 0;
    const c = this.world.camera; c.near = 0.12; c.fov = 64; c.updateProjectionMatrix();
    for (const k of ['visor', 'wrist', 'objective', 'fade', 'guide', 'prompt', 'ring'] as const) this.el[k].style.display = '';
    document.body.classList.add('fp');
    this.pos.y = this.floorY();
  }
  disable() {
    this.active = false; this.world.external = false; document.exitPointerLock?.(); this.tablet.raise(false); this.beacon.visible = false;
    const c = this.world.camera; c.near = 0.5; c.updateProjectionMatrix();
    for (const el of Object.values(this.el)) el.style.display = 'none';
    document.body.classList.remove('fp'); this.tablet.update(1, 0); this.tablet.group.visible = false; this.tablet.screen.style.display = 'none';
  }

  /** Move instantly (used for doors and waking up), with a short fade. */
  async teleport(x: number, z: number, yaw: number, zone = 'outside') {
    this.beforeTeleport?.();
    this.el.fade.classList.add('on'); await new Promise((r) => setTimeout(r, 380));
    this.zone = zone; this.pos.set(x, 0, z); this.pos.y = this.floorY(); this.yaw = yaw; this.pitch = 0; this.vy = 0;
    this.el.fade.classList.remove('on');
  }

  // ------------------------------------------------------------ objectives

  /** Show where to go; resolves when the player gets there and presses [E]. */
  goTo(st: Station, text: string): Promise<void> {
    return new Promise((done) => {
      this.target = st; this.el.objective.textContent = text; this.el.objective.classList.add('on');
      this.onUse = () => { this.target = null; this.onUse = null; this.beacon.visible = false; this.el.objective.classList.remove('on'); this.play('choose'); done(); };
    });
  }
  /** A physical job: stand at the station and hold [E] for `seconds`. Costs suit oxygen. */
  task(st: Station, text: string, seconds: number, o2Cost = 6): Promise<void> {
    return new Promise((done) => {
      this.target = st; this.el.objective.textContent = text + ' · hold E'; this.el.objective.classList.add('on');
      this.hold = { need: seconds, done: 0, cb: () => { this.hold = null; this.target = null; this.beacon.visible = false; this.el.objective.classList.remove('on'); this.el.ring.classList.remove('on'); this.o2 = Math.max(0, this.o2 - o2Cost); this.play('good'); done(); } };
    });
  }
  private near(st: Station) { return (st.zone ?? 'outside') === this.zone && Math.hypot(this.pos.x - st.x, this.pos.z - st.z) < st.r; }
  private use() {
    if (this.target && this.onUse && this.near(this.target)) return this.onUse();
    const door = this.stations.find((s) => s.id.startsWith('door:') && this.near(s));
    if (door) this.onDoor?.(door);
  }
  onDoor: ((s: Station) => void) | null = null;
  private jump() { if (this.grounded) { this.vy = JUMP; this.grounded = false; this.play('down'); } }

  // ------------------------------------------------------------ frame

  update(dt: number) {
    if (!this.active) return;
    const w = this.world, cam = w.camera, tablet = this.tablet;
    let run = false, moved = 0;
    if (this.driver) this.driver(dt); else {
    // gamepad
    const gp = (navigator.getGamepads?.() ?? []).find((p) => p && p.connected);
    let mx = 0, mz = 0; run = !!this.keys.ShiftLeft || !!this.keys.ShiftRight;
    if (!tablet.raised) {
      if (this.keys.KeyW || this.keys.ArrowUp) mz -= 1; if (this.keys.KeyS || this.keys.ArrowDown) mz += 1;
      if (this.keys.KeyA || this.keys.ArrowLeft) mx -= 1; if (this.keys.KeyD || this.keys.ArrowRight) mx += 1;
      if (gp) {
        const dz = (v: number) => (Math.abs(v) < 0.18 ? 0 : v);
        mx += dz(gp.axes[0] ?? 0); mz += dz(gp.axes[1] ?? 0);
        this.yaw -= dz(gp.axes[2] ?? 0) * dt * 2.4; this.pitch = THREE.MathUtils.clamp(this.pitch - dz(gp.axes[3] ?? 0) * dt * 1.8, -1.35, 1.35);
        run = run || !!gp.buttons[10]?.pressed;
        const press = (i: number) => { const now = !!gp.buttons[i]?.pressed, was = this.pad[i]; this.pad[i] = now; return now && !was; };
        if (press(0)) this.jump(); if (press(2)) this.use(); if (press(3)) this.toggleTablet();
        this.keys.PadE = !!gp.buttons[2]?.pressed;
      }
    } else if (gp) { const now = !!gp.buttons[3]?.pressed; if (now && !this.pad[3]) this.toggleTablet(); this.pad[3] = now; }
    const len = Math.hypot(mx, mz); if (len > 1) { mx /= len; mz /= len; }
    const sp = (run ? RUN : WALK) * (this.zone === 'outside' ? 1 : 0.7);
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    let nx = this.pos.x + (mx * cos + mz * sin) * sp * dt, nz = this.pos.z + (-mx * sin + mz * cos) * sp * dt;
    // collisions
    const zn = this.zones[this.zone];
    if (zn) {
      if (zn.radius) { const d = Math.hypot(nx - zn.cx, nz - zn.cz); if (d > zn.radius) { nx = zn.cx + ((nx - zn.cx) / d) * zn.radius; nz = zn.cz + ((nz - zn.cz) / d) * zn.radius; } }
      if (zn.box) { nx = THREE.MathUtils.clamp(nx, zn.box[0], zn.box[2]); nz = THREE.MathUtils.clamp(nz, zn.box[1], zn.box[3]); }
    } else {
      for (const [cx, cz, r] of SOLID) { const d = Math.hypot(nx - cx, nz - cz), rr = r + 0.45; if (d < rr) { nx = cx + ((nx - cx) / d) * rr; nz = cz + ((nz - cz) / d) * rr; } }
      // greenhouse shell (a box you walk around; enter by its door)
      if (nx > -30.6 && nx < -13.4 && nz > -49 && nz < -39) { const dx = Math.min(nx + 30.6, -13.4 - nx), dzz = Math.min(nz + 49, -39 - nz); if (dx < dzz) nx = nx + 30.6 < -13.4 - nx ? -30.6 : -13.4; else nz = nz + 49 < -39 - nz ? -49 : -39; }
      // solar panel rows and their posts
      const lim = 1750; // the rover can take you up to 1.7 km out if (Math.hypot(nx, nz + 20) > lim) { const d = Math.hypot(nx, nz + 20); nx = (nx / d) * lim; nz = ((nz + 20) / d) * lim - 20; }
    }
    moved = Math.hypot(nx - this.pos.x, nz - this.pos.z);
    this.pos.x = nx; this.pos.z = nz;
    // gravity: a jump on Mars lasts much longer than on Earth
    const floor = this.floorY();
    this.vy -= MARS_G * dt; this.pos.y += this.vy * dt;
    if (this.pos.y <= floor) { if (!this.grounded && this.vy < -1.2) this.play('step'); this.pos.y = floor; this.vy = 0; this.grounded = true; }
    // steps, head bob, footprints
    if (this.grounded && moved > 0.0005) {
      this.stride += moved; this.bob += moved * (run ? 3.4 : 4.2);
      if (this.stride > (run ? 1.05 : 0.72)) { this.stride = 0; this.side *= -1; this.play('step'); if (this.zone === 'outside') w.terrain.stamp(this.pos.x + cos * this.side * 0.17, this.pos.z - sin * this.side * 0.17, 0.19, 0.7); }
    }
    cam.position.set(this.pos.x, this.pos.y + EYE + Math.sin(this.bob) * 0.028 * (w.reducedMotion ? 0 : 1), this.pos.z);
    cam.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    }
    tablet.update(dt, w.time);

    // suit oxygen: drains outside, refills in pressurised rooms
    const outside = this.zone === 'outside' && !this.driver; // the rover cabin is pressurised
    if (outside) this.o2 = Math.max(0, this.o2 - dt * (this.cadet ? 0.11 : 0.24) * (run && moved > 0 ? 1.6 : 1)); else this.o2 = Math.min(100, this.o2 + dt * 14);
    if (this.o2 <= 0 && outside) { this.o2 = 35; this.onO2Empty(); }
    this.breathT -= dt; if (this.breathT <= 0) { this.breathT = this.o2 < 25 ? 1.5 : run && moved > 0 ? 2.1 : 3.6; if (outside) this.play('breath'); }

    // station prompt, beacon and guidance arrow
    const t = this.target; let prompt = '';
    if (t) {
      const same = (t.zone ?? 'outside') === this.zone;
      const goal = same ? t : this.stations.find((s) => s.id === (this.zone === 'outside' ? 'door:' + (t.zone ?? '') : 'door:exit:' + this.zone)) ?? t;
      const gy = same && t.y !== undefined ? t.y : this.zones[goal.zone ?? '']?.floor ?? w.terrain.heightAt(goal.x, goal.z);
      this.beacon.visible = true; this.beacon.position.set(goal.x, gy, goal.z);
      const dist = Math.hypot(goal.x - this.pos.x, goal.z - this.pos.z);
      if (same && this.near(t) && !this.driver) {
        if (this.hold) {
          if (this.keys.KeyE || this.keys.PadE) { this.hold.done += dt; this.el.ring.classList.add('on'); this.el.ring.style.setProperty('--p', String(Math.min(1, this.hold.done / this.hold.need))); if (this.hold.done >= this.hold.need) this.hold.cb(); }
          else this.el.ring.classList.remove('on');
          prompt = `Hold [E] · ${t.label}`;
        } else prompt = `[E] ${t.label}`;
      }
      if (this.cadet || dist > 30) {
        const ang = Math.atan2(goal.x - this.pos.x, -(goal.z - this.pos.z)) + this.yaw; // 0 = straight ahead
        const a = Math.atan2(Math.sin(ang), Math.cos(ang));
        this.el.guide.style.display = Math.abs(a) < 0.35 && dist < 6 ? 'none' : '';
        this.el.guide.style.transform = `translate(-50%,-50%) rotate(${a}rad) translateY(-${Math.min(innerHeight, innerWidth) * 0.3}px)`;
        this.el.guide.dataset.d = `${Math.round(dist)} m`;
      } else this.el.guide.style.display = 'none';
    } else { this.el.guide.style.display = 'none'; this.el.ring.classList.remove('on'); }
    if (this.driver) prompt = this.drivePrompt;
    else if (!prompt && !this.tablet.raised) prompt = this.extraPrompt();
    if (!prompt && !this.tablet.raised && !this.driver) { const door = this.stations.find((s) => s.id.startsWith('door:') && this.near(s)); if (door) prompt = `[E] ${door.label}`; }
    this.el.prompt.textContent = this.tablet.raised ? '' : prompt; this.el.prompt.classList.toggle('on', !!prompt && !this.tablet.raised);

    // wrist display: only when it matters
    (this.el.visor as HTMLElement).style.display = this.driver ? 'none' : '';
    const show = outside && (this.o2 < 70 || this.storm > 0.2 || !!this.hold);
    this.el.wrist.classList.toggle('on', show);
    if (show) this.el.wrist.innerHTML = `<b>SUIT O₂</b><i style="--v:${this.o2}%" class="${this.o2 < 25 ? 'low' : ''}"></i><span>${Math.round(this.o2)}%</span><b>RADIATION</b><span>${this.doseRate.toFixed(0)} µGy/h</span>`;
    // visor: dust and sparkle build up in storms
    (this.el.visor.firstElementChild as HTMLElement).style.opacity = String(Math.min(0.75, (outside ? 1 : 0) * ((w as any).dust * 0.9 + this.storm * 0.25)));
  }
}
