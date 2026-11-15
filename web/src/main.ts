// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
/**
 * main.ts — the game controller. Ties the pure simulation (src/sim) to the 3D world (src/world),
 * the interface (src/ui), sound and input. The mission loop is one readable async function: runMission().
 */
import '@fontsource/oxanium/500.css';
import '@fontsource/oxanium/600.css';
import '@fontsource/oxanium/700.css';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import './ui/style.css';
import * as THREE from 'three';
import { World, type Quality } from './world/world';
import { UI, h, icon } from './ui/ui';
import { Screens, GAME, earnAchievements } from './ui/screens';
import { Sound } from './audio';
import { Input } from './input';
import { store } from './store';
import { live, initLive, liveMissionDays } from './data/live';
import { WINDOWS, storyDays, loadArchive, sliceDays } from './data/windows';
import { BAL, DLG, ENDINGS, newMission, startSol, setAlloc, solEvents, choose, endSol, dayOf, tokens, fill, skyFor, type Mission, type DifficultyId, type MissionConfig, type Alloc } from './sim/engine';
import { randomSeed, parseMissionCode } from './sim/rng';

store.load();
const $ = (id: string) => document.getElementById(id)!;
const sound = new Sound();
const settings = store.data.settings;
/** ?capture=1 — fixed-step mode used by scripts/capture.mjs to record cutscene and demo footage. ?q=low|high|ultra forces a preset. */
const CAPTURE = /[?&]capture=1/.test(location.search);
const forcedQ = /[?&]q=(low|high|ultra)/.exec(location.search)?.[1] as Quality | undefined;
if (CAPTURE) { settings.volume = 0; settings.reducedMotion = false; }
const world = new World($('stage') as HTMLCanvasElement, forcedQ ?? (settings.quality === 'auto' ? undefined : (settings.quality as Quality)));
let mission: Mission | null = null;
let runId = 0;

const ui = new UI($('ui'), {
  sound: (n) => sound.play(n),
  speak: (t) => sound.speak(t),
  openMenu: () => openPause(),
  planner: () => settings.planner,
});
const screens = new Screens(ui, applySettings);
const input = new Input($('ui'));
input.onEscape = () => { const s = $('ui').querySelectorAll('.screen'); if (s.length) (s[s.length - 1] as HTMLElement).remove(); else if (world.photo) exitPhoto(); else openPause(); };

function applySettings() {
  document.documentElement.style.setProperty('--ts', String(settings.textSize));
  document.body.classList.toggle('cb', settings.colorBlind);
  document.body.classList.toggle('rm', settings.reducedMotion);
  world.reducedMotion = settings.reducedMotion;
  sound.setVolume(settings.volume); sound.readAloud = settings.readAloud; if (!settings.readAloud) sound.hush();
  if (mission) ui.updateHud(mission);
}

// ------------------------------------------------------------------ boot

const FACTS: [string, string][] = [
  ['Jezero Crater was a lake about 3.5 billion years ago. The ground you are about to see is its real shape, measured from orbit.', 'Terrain: NASA Mars Reconnaissance Orbiter (CTX)'],
  ['A radio message between Earth and Mars takes between about 3 and 22 minutes, depending on where the two planets are.', 'NASA Science'],
  ['Every person needs about 0.84 kilograms of oxygen a day. On Mars, a machine has to make it.', 'NASA life-support research'],
  ['On Mars the daytime sky is butterscotch and the sunset is blue.', 'NASA Science'],
  ['NASA\'s MOXIE experiment made 122 grams of oxygen out of Martian air.', 'NASA'],
  ['Mars has no global magnetic field today, so its surface gets more radiation than Earth\'s.', 'NASA Science'],
];
let factI = 0;
const factTimer = setInterval(() => { factI = (factI + 1) % FACTS.length; $('boot-fact').textContent = FACTS[factI][0]; $('boot-src').textContent = FACTS[factI][1]; }, 5200);

async function boot() {
  applySettings();
  void initLive().then(() => { if (live.mode !== 'loading') $('boot-src').textContent = live.detail; });
  try {
    await world.init(import.meta.env.BASE_URL, (p, l) => { ($('boot-bar') as HTMLElement).style.width = `${Math.round(p * 100)}%`; $('boot-label').textContent = l.toUpperCase(); });
  } catch (e) {
    $('boot-label').textContent = 'THIS DEVICE COULD NOT START THE 3D VIEW'; $('boot-fact').textContent = 'The game needs WebGL 2. Please try a recent version of Chrome, Edge, Firefox or Safari.'; console.error(e); return;
  }
  clearInterval(factTimer);
  applySettings();
  world.start();
  showTitle();
  if (CAPTURE) { world.manual = true; document.body.classList.add('capture'); (window as any).__cap = { ready: true, world, step: (dt: number) => world.step(dt) }; }
  $('boot').classList.add('done');
  setTimeout(() => $('boot').remove(), 1200);
}

function idleOutpost() { world.setOutpost({ power: 70, shield: 30, plants: 45, plantsDead: false, life: 2, garden: 2, shieldLevel: 1, rover: 2, roverHome: true, panelsDusty: false, frost: false }); }

function showTitle() {
  runId++; mission = null;
  ui.showHud(false); ui.setSparkle(0); world.resetLaunch(); world.setLook('default'); world.frameShift = 0;
  idleOutpost(); world.setWeather(0, 0); world.setPhase('dawn', 2); world.jump('title');
  sound.setScene({ power: 70, dust: 0, tension: 0, doseRate: 0 });
  screens.title({
    start: (d) => begin({ kind: 'story', difficulty: d }),
    live: (d) => begin({ kind: 'live', difficulty: d }),
    history: (id, d) => begin({ kind: 'history', windowId: id, difficulty: d }),
    code: (code, d) => { const p = parseMissionCode(code); if (!p || !WINDOWS.some((w) => w.id === p.windowId && w.id !== 'live')) return ui.toast('That code does not match a mission.'); begin({ kind: p.windowId === 'may-2024' ? 'story' : 'history', windowId: p.windowId, difficulty: d, seed: p.seed }); },
  }, () => ({
    mode: live.mode,
    text: live.mode === 'loading' ? 'Checking the Sun…' : `${live.mode === 'live' ? 'Right now on the Sun' : 'The Sun (archived)'}: ${live.headline}`,
    detail: live.detail,
  }));
}

// ------------------------------------------------------------------ mission setup

interface Launch { kind: 'story' | 'live' | 'history'; difficulty: DifficultyId; windowId?: string; seed?: number }

async function begin(l: Launch) {
  sound.unlock(); sound.play('choose');
  if (!document.fullscreenElement && matchMedia('(pointer: fine)').matches) document.documentElement.requestFullscreen?.().catch(() => {});
  let cfg: MissionConfig;
  const seed = l.seed ?? randomSeed();
  if (l.kind === 'live') {
    if (live.mode === 'loading') await initLive();
    const { days, injected } = liveMissionDays();
    cfg = { difficulty: l.difficulty, seed, windowId: 'live', days, live: live.mode === 'live', history: live.mode !== 'live', injectedStorm: injected };
  } else if (l.kind === 'history' && l.windowId && l.windowId !== 'may-2024') {
    const w = WINDOWS.find((x) => x.id === l.windowId)!;
    cfg = { difficulty: l.difficulty, seed, windowId: w.id, days: sliceDays(await loadArchive(w.id), w.sol1), history: true };
  } else cfg = { difficulty: l.difficulty, seed, windowId: 'may-2024', days: storyDays(), history: l.kind === 'history' };
  void runMission(cfg, l);
}

const DUST: Record<string, number> = { clear: 0, haze: 0.22, dust: 0.62, deepDust: 0.95 };
const SCENES: Record<string, string> = { outpost: 'outpost', greenhouse: 'greenhouse', shelter: 'shelter', solar: 'solar', dish: 'dish', airmaker: 'airmaker', delta: 'delta', pad: 'pad', sky: 'sky', interior: 'interior', garage: 'garage' };

function sync(m: Mission, o: { alloc?: Alloc; storm?: number; tension?: number; doseRate?: number } = {}) {
  const s = m.s, a = o.alloc ?? s.alloc;
  world.setOutpost({ power: s.power, shield: s.shield, plants: s.plants, plantsDead: !!s.flags.plantsDead, life: a.life, garden: a.garden, shieldLevel: a.shield, rover: a.rover, roverHome: !s.flags.dilInField, panelsDusty: !!s.flags.panelsDusty, frost: !!s.flags.coldNight });
  const dust = DUST[skyFor(m, s.sol)] ?? 0;
  world.setWeather(dust, o.storm ?? 0);
  const worst = Math.min(s.air, s.health, 100 - Math.min(100, (Math.max(s.dose, s.doseDil) / m.diff.dose.red) * 100));
  const tension = o.tension ?? Math.min(1, Math.max(0, (45 - worst) / 45) + dust * 0.35 + (dayOf(m).game.stormLevel >= 1 ? 0.3 : 0));
  sound.setScene({ power: s.power, dust, tension, doseRate: o.doseRate ?? dayOf(m).rad?.meanRate ?? 4 });
  ui.updateHud(m);
}

// ------------------------------------------------------------------ the mission loop

async function runMission(cfg: MissionConfig, launch: Launch) {
  const my = ++runId, alive = () => my === runId;
  const m = (mission = newMission(cfg));
  ui.clear(); world.setLook('default');
  const first = store.data.missions === 0;
  if (launch.kind === 'story') {
    world.setPhase('dawn', 0.5); world.shot('wide', 9);
    await ui.cinematic((DLG.intro as any[]).map((l) => l.say), first ? 4.6 : 3.2);
    if (!alive()) return;
  }
  ui.showHud(true); world.frameShift = 0.17;
  while (alive() && !m.s.ended) {
    // dawn
    const dawn = startSol(m);
    world.setPhase('dawn', 3.2); world.shot(m.s.sol % 2 ? 'outpost' : 'wide', 3.5); sync(m); sound.play('dawn');
    if (dawn.messages.length) sound.play('message');
    await ui.dawn(m, dawn); if (!alive()) return;
    // power board
    world.setPhase('day', 2.6); world.shot('board', 2.4);
    const alloc = await ui.board(m, { tutorial: first && m.s.sol === 1, onChange: (a) => sync(m, { alloc: a }) }); if (!alive()) return;
    setAlloc(m, alloc); sync(m);
    // events
    for (const ev of solEvents(m)) {
      world.shot(SCENES[ev.def.scene] ?? 'board', 2.6);
      if (ev.def.kind === 'crisis') await runStorm(m, ev, alive);
      else await ui.event(m, ev, (id) => { const r = choose(m, ev.def, id); sync(m); return r; });
      if (!alive()) return;
      sync(m);
    }
    // night
    const today = dayOf(m);
    world.setPhase('sunset', 2.4); world.shot('wide', 3);
    const night = endSol(m);
    if (night.storm) { sound.play('rumble'); ui.setSparkle(0.25 * night.storm.level * (1 - night.storm.protection)); }
    setTimeout(() => alive() && world.setPhase('night', 2.6), 2200);
    sync(m, { storm: night.storm ? night.storm.level / 3 : 0 });
    if (night.harvest) sound.play('good'); else if (Object.entries(night.changes).some(([k, v]) => (k === 'air' || k === 'health') && v < -10)) sound.play('warn');
    await ui.night(m, night, today); if (!alive()) return;
    ui.setSparkle(0);
    if (m.diff.discussion) { const q = (DLG.discussion as any[]).find((d) => d.afterSol === night.sol); if (q) await discuss(q.q); }
  }
  if (alive()) await runEnding(m, launch);
}

function discuss(q: string): Promise<void> {
  return new Promise((done) => { const scr = h('div', { class: 'screen fade-in' }, h('div', { class: 'wrap' }, h('div', { class: 'eyebrow' }, 'Classroom · pause and talk'), h('h1', {}, 'Talk about it'), h('p', { style: 'font-size:1.4em' }, q), h('div', { class: 'actions' }, ui.btn('Back to Mars', 'primary', () => { scr.remove(); done(); })))); $('ui').append(scr); });
}

/** Mini solar-system map: where Earth and Mars really were, and a radio pulse crossing between them. */
function orbitMap(m: Mission): HTMLElement {
  const o = dayOf(m).orbit, S = 62, cx = 165, cy = 120;
  const E = [cx + o.earth.x * S, cy - o.earth.y * S], M = [cx + o.mars.x * S, cy - o.mars.y * S];
  const el = h('div', { html: `<svg class="orbitmap" viewBox="0 0 330 240" role="img" aria-label="Map of the Sun, Earth and Mars on this date">
<circle cx="${cx}" cy="${cy}" r="${S}" fill="none" stroke="rgba(92,200,240,.35)" stroke-dasharray="3 5"/><circle cx="${cx}" cy="${cy}" r="${1.524 * S}" fill="none" stroke="rgba(255,140,90,.35)" stroke-dasharray="3 5"/>
<circle cx="${cx}" cy="${cy}" r="9" fill="#ffd27a"/><text x="${cx + 13}" y="${cy + 4}" fill="#ffd27a" font-size="11" font-family="Oxanium">SUN</text>
<line x1="${E[0]}" y1="${E[1]}" x2="${M[0]}" y2="${M[1]}" stroke="rgba(255,255,255,.35)"/>
<circle cx="${E[0]}" cy="${E[1]}" r="6" fill="#5cc8f0"/><text x="${E[0] + 9}" y="${E[1] + 4}" fill="#5cc8f0" font-size="11" font-family="Oxanium">EARTH</text>
<circle cx="${M[0]}" cy="${M[1]}" r="5" fill="#ff8c5a"/><text x="${M[0] + 9}" y="${M[1] + 4}" fill="#ff8c5a" font-size="11" font-family="Oxanium">MARS</text>
<circle r="3.5" fill="#fff"><animate attributeName="cx" values="${M[0]};${E[0]};${M[0]}" dur="6s" repeatCount="indefinite"/><animate attributeName="cy" values="${M[1]};${E[1]};${M[1]}" dur="6s" repeatCount="indefinite"/></circle>
<text x="165" y="232" fill="#f4f7fa" font-size="12" text-anchor="middle" font-family="Oxanium">${o.distanceMillionKm} million km · ${o.lightMinutes} min each way</text></svg>` });
  return el;
}

async function runStorm(m: Mission, ev: any, alive: () => boolean) {
  const d = dayOf(m), peak = d.rad?.maxRate ?? 12;
  world.setPhase('night', 3.5); world.shot('shelter', 3);
  sound.play('warn'); ui.setSparkle(0.45 + 0.18 * d.game.stormLevel);
  sync(m, { storm: 1, tension: 1, doseRate: peak });
  let intro = ev.lines as any[] | null;
  for (const st of ev.steps) {
    if (st.id === 'dil') { world.shot('delta', 2.6); world.setOutpost({ ...snapshot(m), roverHome: false }); }
    else if (st.id === 'earth') world.shot('dish', 2.6); else world.shot('shelter', 2.2);
    const id = await ui.crisisStep(m, ev, st, intro, st.id === 'earth' ? orbitMap(m) : null); if (!alive()) return;
    intro = null;
    const res = choose(m, ev.def, id, st.id); sync(m, { storm: 1, tension: 1, doseRate: peak });
    await ui.crisisResult(m, st, res); if (!alive()) return;
  }
  world.shot('shelter', 2.4);
}
const snapshot = (m: Mission) => ({ power: m.s.power, shield: m.s.shield, plants: m.s.plants, plantsDead: !!m.s.flags.plantsDead, life: m.s.alloc.life, garden: m.s.alloc.garden, shieldLevel: m.s.alloc.shield, rover: m.s.alloc.rover, roverHome: !m.s.flags.dilInField, panelsDusty: !!m.s.flags.panelsDusty, frost: !!m.s.flags.coldNight });

// ------------------------------------------------------------------ endings

function revealLines(m: Mission): string[] {
  const w = WINDOWS.find((x) => x.id === m.cfg.windowId) ?? WINDOWS.find((x) => x.id === 'live');
  const days = m.cfg.days, peak = days.reduce((a: any, b: any) => (b.game.doseOutside > a.game.doseOutside ? b : a), days[0]);
  const calm = peak.game.doseCalm || 115, src = peak.cmes.injected ?? peak.cmes;
  const flares = days.map((d: any) => d.flares.max).filter(Boolean).sort((a: string, b: string) => (a < b ? 1 : -1));
  const t: Record<string, string> = {
    ...tokens(m), delayMin: String(peak.orbit.lightMinutes), roundTripMin: String(Math.round(peak.orbit.lightMinutes * 2)),
    peakRate: String(peak.rad?.maxRate ?? '-'), calmRate: (calm / 24).toFixed(1), peakRatio: peak.rad ? String(Math.round(peak.rad.maxRate / (calm / 24))) : '-',
    peakTime: peak.rad?.maxTime?.slice(11, 16) ?? '-', cmeSpeed: String(src.fastest ?? '-'), cmeTime: src.fastestStart?.slice(11, 16) ?? '-',
    doseRatio: (peak.game.doseOutside / calm).toFixed(1), kpMax: String(Math.max(...days.map((d: any) => d.earth.kpMax ?? 0))), flareMax: days.map((d: any) => d.flares.max).filter(Boolean).sort((a: string, b: string) => rank(b) - rank(a))[0] ?? 'none',
    window: `${days[0].date} to ${days[days.length - 1].date}`,
  };
  void flares;
  const lines = [DLG.reveal.title, DLG.reveal.lead, ...w.reveal.map((l: string) => fill(l, t))];
  if (m.cfg.injectedStorm) lines.push(DLG.reveal.injected);
  lines.push(DLG.reveal.footer);
  return lines;
}
const rank = (c: string) => ({ A: 0, B: 1, C: 2, M: 3, X: 4 } as any)[c[0]] * 100 + parseFloat(c.slice(1) || '1');

const ENDING_SHOTS: Record<string, { phase: any; shot?: string; orbit?: [number, number, number]; launch?: boolean }> = {
  pad_night_launch: { phase: 'night', shot: 'launch', launch: true }, pad_sunset_launch: { phase: 'sunset', shot: 'launch', launch: true }, earthrise_dish: { phase: 'night', orbit: [-34, -14, 60], launch: true },
  rover_storm_return: { phase: 'sunset', shot: 'launch', launch: true }, greenhouse_night: { phase: 'night', orbit: [-22, -44, 46] }, delta_bluehour: { phase: 'sunset', shot: 'launch', launch: true }, outpost_dust_dawn: { phase: 'dawn', shot: 'launch', launch: true },
};

async function runEnding(m: Mission, launch: Launch) {
  const my = runId, alive = () => my === runId;
  const e = ENDINGS.find((x) => x.id === m.s.ended)!;
  ui.showHud(false); ui.setSparkle(0); world.frameShift = 0;
  store.data.endings[e.id] = true; store.data.missions++; store.save();
  const earned = earnAchievements(m);
  sound.setScene({ power: 60, dust: 0, tension: e.id === 'evac' ? 0.5 : 0, doseRate: 0 }); world.setWeather(0, e.id === 'secret' ? 0.5 : 0);
  // 1 — the reveal: it really happened
  world.setPhase('night', 3); world.orbit([0, -30], 240, 44, 0.03);
  await ui.cinematic(revealLines(m), 6.2); if (!alive()) return;
  // 2 — the ending
  const sh = ENDING_SHOTS[e.shot] ?? ENDING_SHOTS.pad_sunset_launch;
  world.setLook(e.grade); world.setPhase(sh.phase, 3);
  if (sh.orbit) world.orbit([sh.orbit[0], sh.orbit[1]], sh.orbit[2], 9, 0.045); else world.shot(sh.shot!, 4);
  sound.play(e.id === 'evac' || e.id === 'survival' ? 'dawn' : 'good');
  const variants = (e.variants || []).filter((v: any) => testFlag(m, v.when)).map((v: any) => v.text);
  if (sh.launch) setTimeout(() => { if (alive()) { world.startLaunch(); sound.play('rumble'); } }, 9000);
  await ui.cinematic([e.title.toUpperCase(), ...e.epilogue, ...variants], 6.6); if (!alive()) return;
  // 3 — debrief
  world.orbit([0, -30], 300, 52, 0.02);
  screens.debrief(m, e.id, earned, { again: () => { world.resetLaunch(); void begin({ ...launch, seed: undefined }); }, title: showTitle });
}
const testFlag = (m: Mission, c: any) => (c?.flag ? !!m.s.flags[c.flag] === (c.is ?? true) : true);

// ------------------------------------------------------------------ pause and photo mode

function openPause() {
  if (document.querySelector('.screen')) return;
  screens.pause(mission, { quit: showTitle, photo: enterPhoto });
}
let photoBar: HTMLElement | null = null;
function enterPhoto() {
  world.photo = true; $('ui').style.visibility = 'hidden';
  const cam = world.camera, target = new THREE.Vector3(0, 6, -36);
  const sph = new THREE.Spherical().setFromVector3(cam.position.clone().sub(target));
  const place = () => { sph.phi = Math.min(1.52, Math.max(0.25, sph.phi)); sph.radius = Math.min(2500, Math.max(12, sph.radius)); cam.position.setFromSpherical(sph).add(target); const g = world.terrain.heightAt(cam.position.x, cam.position.z) + 1.5; if (cam.position.y < g) cam.position.y = g; cam.lookAt(target); };
  let drag = false, px = 0, py = 0;
  const cv = world.renderer.domElement;
  const down = (e: PointerEvent) => { drag = true; px = e.clientX; py = e.clientY; }, up = () => (drag = false);
  const move = (e: PointerEvent) => { if (!drag) return; sph.theta -= (e.clientX - px) * 0.005; sph.phi -= (e.clientY - py) * 0.004; px = e.clientX; py = e.clientY; place(); };
  const wheel = (e: WheelEvent) => { sph.radius *= e.deltaY > 0 ? 1.1 : 0.9; place(); };
  cv.addEventListener('pointerdown', down); addEventListener('pointerup', up); cv.addEventListener('pointermove', move); cv.addEventListener('wheel', wheel, { passive: true });
  const phases = ['dawn', 'day', 'sunset', 'night'] as const; let pi = 1;
  photoBar = h('div', { class: 'panel glass bottom', style: 'width:auto;z-index:50;position:fixed' }, h('div', { class: 'row' },
    h('span', { class: 'eyebrow', style: 'margin:0' }, 'Photo mode · drag to look, scroll to zoom'),
    ui.btn('Time of day', 'small', () => { pi = (pi + 1) % 4; world.setPhase(phases[pi], 1.5); }),
    ui.btn('Save photo', 'small primary', () => { const a = document.createElement('a'); a.href = world.capture(); a.download = 'lakeshore-outpost.png'; a.click(); }),
    ui.btn('Hide bar', 'small', () => { photoBar!.style.opacity = '0'; setTimeout(() => photoBar && (photoBar.style.opacity = '1'), 6000); }),
    ui.btn('Exit', 'small', exitPhoto)));
  (photoBar as any)._off = () => { cv.removeEventListener('pointerdown', down); removeEventListener('pointerup', up); cv.removeEventListener('pointermove', move); cv.removeEventListener('wheel', wheel); };
  document.body.append(photoBar); place();
}
function exitPhoto() { if (!world.photo) return; world.photo = false; (photoBar as any)?._off?.(); photoBar?.remove(); photoBar = null; $('ui').style.visibility = ''; world.shot('board', 1.2); }

addEventListener('visibilitychange', () => { if (document.hidden) sound.hush(); });
(window as any).__game = { world, store, get mission() { return mission; } };
void boot();
void icon; void GAME;
