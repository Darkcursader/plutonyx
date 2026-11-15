// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
/**
 * interiors.ts — the rooms you can walk into in first person (command deck, storm shelter, greenhouse) and
 * the physical screens inside them: power board, radiation monitor, comms console. The screens are live
 * textures drawn from the mission state, so the habitat itself shows what the tablet shows.
 */
import * as THREE from 'three';
import type { Station } from './fp';

export interface ScreenData { sol: number; air: number; power: number; shield: number; need: number; alloc: number[]; solar: number; doseRate: number; calmRate: number; dose: number; limit: number; storm: number; delay: number; inbox: number; realDate: string; live: boolean }

type Ground = (x: number, z: number) => number;
const C = { white: 0xe6e1d6, graphite: 0x2b2d31, orange: 0xc8551e };

function panelTex(): THREE.CanvasTexture {
  const cv = document.createElement('canvas'); cv.width = cv.height = 512; const c = cv.getContext('2d')!;
  c.fillStyle = '#d9d4c8'; c.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1800; i++) { c.fillStyle = `rgba(60,50,40,${Math.random() * 0.05})`; c.fillRect(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 8, 1 + Math.random() * 2); }
  c.strokeStyle = 'rgba(30,30,30,.5)'; c.lineWidth = 2;
  for (let x = 0; x <= 512; x += 128) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 512); c.stroke(); }
  for (const y of [96, 400]) { c.beginPath(); c.moveTo(0, y); c.lineTo(512, y); c.stroke(); }
  c.fillStyle = '#c8551e'; c.fillRect(0, 404, 512, 14);
  c.fillStyle = 'rgba(30,30,30,.55)'; for (let x = 12; x < 512; x += 32) { c.beginPath(); c.arc(x, 104, 2, 0, 7); c.fill(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(6, 1); t.anisotropy = 8; return t;
}
function floorTex(): THREE.CanvasTexture {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const c = cv.getContext('2d')!;
  c.fillStyle = '#30333a'; c.fillRect(0, 0, 256, 256); c.strokeStyle = '#1c1e22'; c.lineWidth = 3;
  for (let i = 0; i <= 256; i += 32) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 256); c.moveTo(0, i); c.lineTo(256, i); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,.05)'; for (let y = 4; y < 256; y += 32) for (let x = 4; x < 256; x += 32) c.fillRect(x, y, 24, 24);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 8); t.anisotropy = 8; return t;
}

class Screen {
  cv = document.createElement('canvas'); tex: THREE.CanvasTexture; mesh: THREE.Mesh;
  constructor(w: number, h: number, public draw: (c: CanvasRenderingContext2D, d: ScreenData, W: number, H: number) => void) {
    this.cv.width = 640; this.cv.height = Math.round((640 * h) / w);
    this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: this.tex, toneMapped: false }));
  }
  update(d: ScreenData) { const c = this.cv.getContext('2d')!; c.fillStyle = '#0a0f15'; c.fillRect(0, 0, this.cv.width, this.cv.height); this.draw(c, d, this.cv.width, this.cv.height); this.tex.needsUpdate = true; }
}
const font = (c: CanvasRenderingContext2D, px: number, bold = true) => { c.font = `${bold ? 600 : 400} ${px}px Oxanium, sans-serif`; };
function head(c: CanvasRenderingContext2D, t: string, W: number, col = '#e6e1d6') { c.fillStyle = '#c8551e'; c.fillRect(24, 22, 8, 34); c.fillStyle = col; font(c, 30); c.fillText(t, 44, 50); c.fillStyle = 'rgba(255,255,255,.14)'; c.fillRect(24, 70, W - 48, 2); }
function bar(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, v: number, col: string) { c.fillStyle = 'rgba(255,255,255,.1)'; c.fillRect(x, y, w, h); c.fillStyle = col; c.fillRect(x, y, w * Math.max(0, Math.min(1, v)), h); }

export class Interiors {
  group = new THREE.Group();
  stations: Station[] = [];
  zones: { id: string; cx: number; cz: number; floor: number; radius?: number; box?: [number, number, number, number]; exit: [number, number] }[] = [];
  private screens: Screen[] = [];
  private lamps: THREE.PointLight[] = [];
  private strips: THREE.MeshStandardMaterial;

  constructor(ground: Ground) {
    const M = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.receiveShadow = true; return o; };
    const wall = new THREE.MeshStandardMaterial({ map: panelTex(), roughness: 0.85, metalness: 0.05, side: THREE.BackSide });
    const floor = new THREE.MeshStandardMaterial({ map: floorTex(), roughness: 0.7, metalness: 0.4 });
    const white = new THREE.MeshStandardMaterial({ color: C.white, roughness: 0.75 });
    const dark = new THREE.MeshStandardMaterial({ color: C.graphite, roughness: 0.6, metalness: 0.4 });
    const orange = new THREE.MeshStandardMaterial({ color: C.orange, roughness: 0.7 });
    const cloth = new THREE.MeshStandardMaterial({ color: 0x4b5a6a, roughness: 0.95 });
    this.strips = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xfff0d8, emissiveIntensity: 2.4 });

    // ---------------- command deck (inside the core habitat drum)
    const gy = ground(0, -38), F = 1.95, H = 2.9;
    const cmd = new THREE.Group(); cmd.position.set(0, gy + F, -38);
    cmd.add(M(new THREE.CylinderGeometry(5.2, 5.2, H, 64, 1, true), wall, 0, H / 2, 0));
    cmd.add(M(new THREE.CircleGeometry(5.2, 64).rotateX(-Math.PI / 2), floor, 0, 0.01, 0));
    cmd.add(M(new THREE.CircleGeometry(5.2, 64).rotateX(Math.PI / 2), white, 0, H, 0));
    cmd.add(M(new THREE.TorusGeometry(3.4, 0.05, 8, 64).rotateX(Math.PI / 2), this.strips, 0, H - 0.04, 0));
    cmd.add(M(new THREE.TorusGeometry(5.05, 0.04, 8, 64).rotateX(Math.PI / 2), this.strips, 0, 0.12, 0));
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const rib = M(new THREE.BoxGeometry(0.1, H, 0.18), dark, Math.cos(a) * 5.1, H / 2, Math.sin(a) * 5.1); rib.rotation.y = -a; cmd.add(rib); }
    // central chart table
    cmd.add(M(new THREE.CylinderGeometry(0.95, 0.8, 0.12, 40), dark, 0, 0.92, 0)); cmd.add(M(new THREE.CylinderGeometry(0.16, 0.3, 0.9, 16), dark, 0, 0.45, 0));
    cmd.add(M(new THREE.CylinderGeometry(0.86, 0.86, 0.01, 40), new THREE.MeshStandardMaterial({ color: 0x06141a, emissive: 0x2a6f8a, emissiveIntensity: 0.9 }), 0, 0.985, 0));
    // consoles: desk + tilted live screen, facing the centre
    const consoleAt = (a: number, s: Screen, id: string, label: string) => {
      const g = new THREE.Group(); g.position.set(Math.cos(a) * 4.35, 0, Math.sin(a) * 4.35); g.rotation.y = -a - Math.PI / 2;
      g.add(M(new THREE.BoxGeometry(2.3, 0.86, 0.75), dark, 0, 0.43, 0)); g.add(M(new THREE.BoxGeometry(2.36, 0.05, 0.82), white, 0, 0.88, 0));
      g.add(M(new THREE.BoxGeometry(2.2, 1.25, 0.08), dark, 0, 1.72, -0.3)); g.add(M(new THREE.BoxGeometry(2.3, 0.06, 0.12), orange, 0, 2.38, -0.3));
      s.mesh.position.set(0, 1.72, -0.255); g.add(s.mesh);
      for (const x of [-0.8, -0.4, 0, 0.4, 0.8]) g.add(M(new THREE.BoxGeometry(0.22, 0.02, 0.14), new THREE.MeshStandardMaterial({ color: 0x101418, emissive: x === 0 ? C.orange : 0x5cc8f0, emissiveIntensity: 0.8 }), x, 0.915, 0.12));
      g.add(M(new THREE.CylinderGeometry(0.2, 0.24, 0.5, 16), cloth, 0, 0.25, 0.95));
      cmd.add(g); this.screens.push(s);
      this.stations.push({ id, x: Math.cos(a) * 3.3, z: -38 + Math.sin(a) * 3.3, r: 1.7, label, zone: 'command' });
    };
    consoleAt(0, new Screen(2.05, 1.12, (c, d, W) => {
      head(c, 'POWER BOARD', W); font(c, 20, false); c.fillStyle = '#9fb0bf'; c.fillText(`SOL ${d.sol}  ·  TODAY'S SUN ${Math.round(d.solar / 10)} CELLS`, 44, 104);
      ['AIR MAKER', 'GREENHOUSE', 'STORM SHIELD', 'ROVER + DRILL'].forEach((n, i) => { const y = 140 + i * 44; c.fillStyle = '#e6e1d6'; font(c, 20); c.fillText(n, 44, y + 18); for (let k = 0; k < 3; k++) { c.fillStyle = k < d.alloc[i] ? ['#5cc8f0', '#3cc79a', '#b79cff', '#f5f1e8'][i] : 'rgba(255,255,255,.12)'; c.fillRect(300 + k * 96, y, 84, 22); } });
      c.fillStyle = '#f2c744'; font(c, 20); c.fillText('BATTERY', 44, 334); bar(c, 300, 318, 276, 20, d.power / 100, '#f2c744');
    }), 'power', 'Use the power board');
    consoleAt(-Math.PI / 2, new Screen(2.05, 1.12, (c, d, W, Hh) => {
      const hot = d.storm >= 2; head(c, hot ? 'RADIATION — STORM' : 'RADIATION MONITOR', W, hot ? '#ff6b4a' : '#e6e1d6');
      c.fillStyle = hot ? '#ff6b4a' : '#8be0b0'; font(c, 84); c.fillText(d.doseRate.toFixed(d.doseRate < 20 ? 1 : 0), 44, 176); font(c, 22, false); c.fillStyle = '#9fb0bf'; c.fillText('µGy per hour outside', 44, 208); c.fillText(`a calm hour: ${d.calmRate.toFixed(1)}`, 44, 236);
      c.fillStyle = '#e6e1d6'; font(c, 20); c.fillText('CREW BADGE', 44, 284); bar(c, 220, 268, 356, 20, d.dose / d.limit, d.dose / d.limit > 0.75 ? '#ffb05c' : '#8be0b0');
      c.fillText('SHIELD', 44, 324); bar(c, 220, 308, 356, 20, d.shield / 100, '#b79cff'); c.fillStyle = '#fff'; c.fillRect(220 + 356 * (d.need / 100), 302, 3, 32);
      font(c, 15, false); c.fillStyle = '#6f8090'; c.fillText(d.live ? 'LIVE SPACE WEATHER' : 'REAL DATA · ARCHIVED', 44, Hh - 14);
    }), 'radmon', 'Check the radiation monitor');
    consoleAt(Math.PI, new Screen(2.05, 1.12, (c, d, W) => {
      head(c, 'COMMS · EARTH', W); c.fillStyle = '#5cc8f0'; font(c, 72); c.fillText(`${d.delay.toFixed(1)} min`, 44, 168); font(c, 22, false); c.fillStyle = '#9fb0bf'; c.fillText('radio delay, one way', 44, 200);
      c.fillStyle = d.inbox ? '#f2c744' : '#6f8090'; font(c, 26); c.fillText(d.inbox ? `${d.inbox} MESSAGE${d.inbox > 1 ? 'S' : ''} IN FLIGHT` : 'NO MESSAGE IN FLIGHT', 44, 262);
      c.strokeStyle = 'rgba(92,200,240,.5)'; c.lineWidth = 2; c.beginPath(); for (let x = 0; x < 540; x += 6) { const y = 310 + Math.sin(x * 0.07 + performance.now() * 0.004) * 12 * (d.inbox ? 1 : 0.25); if (x) c.lineTo(44 + x, y); else c.moveTo(44 + x, y); } c.stroke();
    }), 'comms', 'Use the comms console');
    // bunks, lockers, airlock door
    for (const [a, n] of [[2.25, 2], [2.75, 2]] as [number, number][]) for (let k = 0; k < n; k++) { const b = new THREE.Group(); b.position.set(Math.cos(a) * 4.3, 0.45 + k * 1.15, Math.sin(a) * 4.3); b.rotation.y = -a + Math.PI / 2; b.add(M(new THREE.BoxGeometry(2.0, 0.12, 0.9), dark)); b.add(M(new THREE.BoxGeometry(1.9, 0.14, 0.82), cloth, 0, 0.12, 0)); b.add(M(new THREE.BoxGeometry(0.4, 0.1, 0.6), white, -0.7, 0.24, 0)); cmd.add(b); }
    for (const a of [-2.3, -2.75]) { const l = M(new THREE.BoxGeometry(1.1, 2.2, 0.5), white, Math.cos(a) * 4.75, 1.1, Math.sin(a) * 4.75); l.rotation.y = -a + Math.PI / 2; cmd.add(l); const hnd = M(new THREE.BoxGeometry(0.04, 0.4, 0.04), orange, Math.cos(a) * 4.45, 1.2, Math.sin(a) * 4.45); cmd.add(hnd); }
    const door = new THREE.Group(); door.position.set(0, 0, 5.05); door.add(M(new THREE.BoxGeometry(1.5, 2.2, 0.16), dark, 0, 1.1, 0)); door.add(M(new THREE.TorusGeometry(0.34, 0.035, 8, 24), orange, 0, 1.25, -0.1)); door.add(M(new THREE.BoxGeometry(1.7, 0.1, 0.2), this.strips, 0, 2.32, -0.02)); cmd.add(door);
    for (const [x, z] of [[2, 2], [-2, -2]]) { const l = new THREE.PointLight(0xffe6c4, 14, 14, 1.6); l.position.set(x, 2.5, z); cmd.add(l); this.lamps.push(l); }
    this.group.add(cmd);
    this.zones.push({ id: 'command', cx: 0, cz: -38, floor: gy + F, radius: 4.55, exit: [0, -27.4] });
    this.stations.push({ id: 'bunk', x: -2.6, z: -35.0, r: 1.7, label: 'End the sol (your bunk)', zone: 'command' }, { id: 'table', x: 0, z: -36.7, r: 1.6, label: 'Talk at the chart table', zone: 'command' },
      { id: 'door:command', x: 0, z: -27.2, r: 2.4, label: 'Enter the habitat (airlock)' }, { id: 'door:exit:command', x: 0, z: -33.9, r: 1.5, label: 'Airlock: go outside', zone: 'command' });

    // ---------------- storm shelter (under the regolith mound)
    const sy = ground(20, -52), sh = new THREE.Group(); sh.position.set(20, sy + 0.15, -52);
    sh.add(M(new THREE.SphereGeometry(3.6, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.72, 1), new THREE.MeshStandardMaterial({ color: 0x6d5a4c, roughness: 1, side: THREE.BackSide })));
    sh.add(M(new THREE.CircleGeometry(3.6, 48).rotateX(-Math.PI / 2), floor, 0, 0.01, 0));
    const water = new THREE.MeshStandardMaterial({ color: 0x4d8fe0, transparent: true, opacity: 0.55, roughness: 0.1, emissive: 0x123a66, emissiveIntensity: 0.5 });
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + 0.3; if (Math.abs(a - Math.PI / 2 - 0.3) < 0.5) continue; sh.add(M(new THREE.CylinderGeometry(0.42, 0.42, 1.7, 16), water, Math.cos(a) * 3.0, 0.9, Math.sin(a) * 3.0)); sh.add(M(new THREE.CylinderGeometry(0.46, 0.46, 0.1, 16), dark, Math.cos(a) * 3.0, 1.8, Math.sin(a) * 3.0)); }
    sh.add(M(new THREE.TorusGeometry(1.5, 0.22, 10, 40).rotateX(Math.PI / 2), cloth, 0, 0.42, 0));
    sh.add(M(new THREE.TorusGeometry(2.0, 0.035, 8, 48).rotateX(Math.PI / 2), this.strips, 0, 2.2, 0));
    const sl = new THREE.PointLight(0xbfd8ff, 8, 10, 1.6); sl.position.set(0, 2, 0); sh.add(sl); this.lamps.push(sl);
    this.group.add(sh);
    this.zones.push({ id: 'shelter', cx: 20, cz: -52, floor: sy + 0.15, radius: 2.5, exit: [20, -42.6] });
    this.stations.push({ id: 'shelter', x: 20, z: -52, r: 2.2, label: 'Shelter here', zone: 'shelter' }, { id: 'door:shelter', x: 20, z: -43.4, r: 2.4, label: 'Enter the storm shelter' }, { id: 'door:exit:shelter', x: 20, z: -49.9, r: 1.3, label: 'Leave the shelter', zone: 'shelter' });

    // ---------------- greenhouse (the real shell; you walk between the racks)
    const hy = ground(-22, -44);
    this.zones.push({ id: 'greenhouse', cx: -22, cz: -44, floor: hy + 0.36, box: [-29.3, -47.2, -14.7, -40.8], exit: [-22, -37.4] });
    this.stations.push({ id: 'greenhouse', x: -22, z: -44, r: 3.4, label: 'Talk to Ana in the greenhouse', zone: 'greenhouse' }, { id: 'breaker', x: -27, z: -44, r: 2, label: 'Greenhouse power breaker', zone: 'greenhouse' },
      { id: 'door:greenhouse', x: -22, z: -37.6, r: 2.4, label: 'Enter the greenhouse' }, { id: 'door:exit:greenhouse', x: -22, z: -41.1, r: 1.4, label: 'Leave the greenhouse', zone: 'greenhouse' });

    // ---------------- places outside
    this.stations.push(
      { id: 'solar', x: 29, z: -3, r: 4, label: 'Solar field' }, { id: 'dish', x: -31, z: -11.5, r: 3, label: 'Comms dish' }, { id: 'airmaker', x: 13.6, z: -27, r: 2.8, label: 'Air Maker' },
      { id: 'garage', x: -11.5, z: -6.5, r: 3, label: 'Rover pad radio' }, { id: 'pad', x: 0, z: 42, r: 5, label: 'Landing pad' }, { id: 'sky', x: -6, z: -18, r: 4, label: 'Look at the sky' }, { id: 'yard', x: 2, z: -22, r: 4, label: 'Meet the crew outside' });
  }

  /** Lamps are only lit in the room the astronaut is in. */
  setRoom(zone: string) { this.lamps.forEach((l, i) => { l.visible = zone === (i < 2 ? 'command' : 'shelter'); }); }
  update(d: ScreenData, powerK: number) {
    for (const s of this.screens) s.update(d);
    for (const l of this.lamps) l.intensity = (l.distance > 12 ? 14 : 8) * powerK;
    this.strips.emissiveIntensity = 0.4 + 2.2 * powerK;
  }
}
