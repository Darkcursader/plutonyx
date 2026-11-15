// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
/**
 * tablet.ts — the hand-held 3D tablet. A real 3D device rides in front of the astronaut's helmet; its screen
 * is the game's interface. The interface is live HTML (crisp at any size, usable with mouse, touch, keyboard
 * and gamepad), mapped onto the tablet's screen each frame with a perspective transform computed from the
 * four screen corners, so it tilts and moves with the device. A glare layer sits on top.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const SW = 0.5, SH = 0.31;            // screen size in metres
export const TW = 1000, TH = 620;     // interface size in CSS pixels (same aspect)

function adj(m: number[]) { return [m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4], m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5], m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3]]; }
function mm(a: number[], b: number[]) { const c = new Array(9).fill(0); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) c[3 * i + j] += a[3 * i + k] * b[3 * k + j]; return c; }
function mv(m: number[], v: number[]) { return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]]; }
function basis(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number) { const m = [x1, x2, x3, y1, y2, y3, 1, 1, 1]; const v = mv(adj(m), [x4, y4, 1]); return mm(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]); }
/** CSS matrix3d that maps a w×h rectangle onto the quad p (top-left, top-right, bottom-left, bottom-right). */
function quadMatrix(w: number, h: number, p: number[][]): string {
  const s = basis(0, 0, w, 0, 0, h, w, h), d = basis(p[0][0], p[0][1], p[1][0], p[1][1], p[2][0], p[2][1], p[3][0], p[3][1]);
  const t = mm(d, adj(s)); for (let i = 0; i < 9; i++) t[i] /= t[8];
  return `matrix3d(${[t[0], t[3], 0, t[6], t[1], t[4], 0, t[7], 0, 0, 1, 0, t[2], t[5], 0, t[8]].join(',')})`;
}

export class Tablet {
  group = new THREE.Group();
  /** The HTML element that IS the screen. Put interface panels inside `content`. */
  screen = document.createElement('div');
  content = document.createElement('div');
  tabs = document.createElement('div');
  status = document.createElement('div');
  raised = false;
  private k = 0;                        // 0 lowered … 1 raised
  private corners = [new THREE.Vector3(-SW / 2, SH / 2, 0.009), new THREE.Vector3(SW / 2, SH / 2, 0.009), new THREE.Vector3(-SW / 2, -SH / 2, 0.009), new THREE.Vector3(SW / 2, -SH / 2, 0.009)];
  private v = new THREE.Vector3();
  onTab: (id: string) => void = () => {};
  private tabId = 'power';

  constructor(private camera: THREE.PerspectiveCamera, host: HTMLElement, hands: THREE.Object3D | null) {
    const graphite = new THREE.MeshStandardMaterial({ color: 0x3a3d43, roughness: 0.62, metalness: 0.35, emissive: 0x0c0d0f, emissiveIntensity: 1 });
    const orange = new THREE.MeshStandardMaterial({ color: 0xc8551e, roughness: 0.7, metalness: 0.05, emissive: 0x3a1606, emissiveIntensity: 1 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x05070a, roughness: 0.18, metalness: 0.2, emissive: 0x0a1016, emissiveIntensity: 1 });
    const body = new THREE.Mesh(new RoundedBoxGeometry(SW + 0.05, SH + 0.05, 0.018, 5, 0.012), graphite);
    this.group.add(body);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), glass); scr.position.z = 0.0092; this.group.add(scr);
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const b = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.06, 0.026, 3, 0.012), orange); b.position.set(sx * (SW / 2 + 0.008), sy * (SH / 2 + 0.008), 0); this.group.add(b); }
    for (const sx of [-1, 1]) { const grip = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.16, 0.03, 3, 0.012), graphite); grip.position.set(sx * (SW / 2 + 0.036), -0.02, -0.004); this.group.add(grip); }
    const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.004, 12), new THREE.MeshBasicMaterial({ color: 0x5cc8f0 })); lamp.position.set(0, SH / 2 + 0.014, 0.0095); this.group.add(lamp);
    for (let i = 0; i < 7; i++) { const rib = new THREE.Mesh(new THREE.BoxGeometry(SW * 0.7, 0.006, 0.004), graphite); rib.position.set(0, -SH / 2 + 0.05 + i * 0.035, -0.011); this.group.add(rib); }
    if (hands) for (const sx of [-1, 1]) { const g = hands.clone(true); g.scale.setScalar(sx < 0 ? 1 : 1); g.scale.x *= sx; g.position.set(sx * (SW / 2 + 0.05), -0.07, -0.03); g.rotation.set(-0.3, sx * 0.5, sx * -0.25); this.group.add(g); }
    this.group.traverse((o) => { o.frustumCulled = false; (o as THREE.Mesh).castShadow = false; });
    const light = new THREE.PointLight(0x9fd8ff, 0.5, 1.2); light.position.set(0, 0, 0.25); this.group.add(light);
    camera.add(this.group);
    this.group.visible = false;

    this.screen.className = 'tablet-screen';
    this.screen.style.width = TW + 'px'; this.screen.style.height = TH + 'px';
    this.tabs.className = 'tablet-tabs'; this.status.className = 'tablet-status'; this.content.className = 'tablet-content';
    const glare = document.createElement('div'); glare.className = 'tablet-glare';
    this.screen.append(this.status, this.tabs, this.content, glare);
    host.append(this.screen);
    this.setTabs([['power', 'Power'], ['life', 'Life support'], ['shield', 'Shielding'], ['garden', 'Greenhouse'], ['comms', 'Comms'], ['crew', 'Crew'], ['log', 'Science log']]);
  }

  setTabs(tabs: [string, string][]) {
    this.tabs.replaceChildren(...tabs.map(([id, label]) => { const b = document.createElement('button'); b.textContent = label; b.dataset.tab = id; b.className = id === this.tabId ? 'on' : ''; b.onclick = () => this.selectTab(id); return b; }));
  }
  selectTab(id: string) { this.tabId = id; this.tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('on', (b as HTMLElement).dataset.tab === id)); this.onTab(id); }
  get tab() { return this.tabId; }
  /** While a mission panel (report, power routing, event…) is on screen the tab bar steps aside. */
  setBusy(b: boolean) { this.screen.classList.toggle('busy', b); }

  raise(on: boolean) { this.raised = on; this.screen.classList.toggle('up', on); }

  update(dt: number, time: number) {
    this.k += ((this.raised ? 1 : 0) - this.k) * Math.min(1, dt * 7);
    const k = this.k, vis = k > 0.02;
    this.group.visible = vis; this.screen.style.display = vis ? 'block' : 'none';
    if (!vis) return;
    const e = 1 - Math.pow(1 - k, 3);
    const aspect = this.camera.aspect, dist = aspect < 1.5 ? 0.5 : 0.43;
    this.group.position.set(0.02 * (1 - e), -0.75 * (1 - e) - 0.012 + Math.sin(time * 1.3) * 0.0015, -dist - 0.12 * (1 - e));
    this.group.rotation.set(-0.95 * (1 - e) - 0.05, 0.06 * (1 - e) + Math.sin(time * 0.9) * 0.004, 0.012);
    this.group.updateMatrixWorld(true);
    const w = innerWidth, h = innerHeight;
    const pts = this.corners.map((c) => { this.v.copy(c).applyMatrix4(this.group.matrixWorld).project(this.camera); return [(this.v.x * 0.5 + 0.5) * w, (-this.v.y * 0.5 + 0.5) * h]; });
    this.screen.style.transform = quadMatrix(TW, TH, pts);
    this.screen.style.opacity = String(Math.min(1, e * 1.4));
  }
}
