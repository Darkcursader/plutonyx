// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
/**
 * mode.ts — glue between the mission loop and first-person play. The loop asks "go to this place", "open the
 * tablet", "do this job"; this file turns those into beacons, doors, the tablet and hold-[E] tasks, and draws
 * the tablet's own tabs (power, life support, shielding, greenhouse, comms, crew, science log).
 */
import * as THREE from 'three';
import type { World } from '../world/world';
import { FirstPerson, type Station } from './fp';
import { Interiors, type ScreenData } from './interiors';
import { RoverDrive } from './rover';
import { BAL, dayOf, tokens, shieldNeed, derived, type Mission, type Line } from '../sim/engine';
import { h, icon, CREW, type UI } from '../ui/ui';
import crewJson from '@shared/design/crew.json';
import './fp.css';

const SCENE_STATION: Record<string, string> = { outpost: 'yard', greenhouse: 'greenhouse', shelter: 'shelter', solar: 'solar', dish: 'dish', airmaker: 'airmaker', delta: 'garage', pad: 'pad', sky: 'sky', interior: 'table', garage: 'garage' };
const ENTRY: Record<string, [number, number]> = { command: [0, -34.7], greenhouse: [-22, -41.7], shelter: [20, -50.7] };
/** Choices that you then carry out with your own hands: [station, what to do, seconds, suit oxygen]. */
const JOBS: Record<string, [string, string, number, number]> = {
  brush: ['solar', 'Brush the dust off the solar panels', 6, 12], cover_panels: ['solar', 'Tilt and cover the solar panels', 6, 12], fix_now: ['airmaker', 'Swap the clogged scrubber filter', 4, 6],
  patch: ['yard', 'Patch the airlock door seal', 4, 4], divert: ['breaker', 'Throw the greenhouse power breaker', 3, 0], both: ['breaker', 'Throw the greenhouse power breaker', 3, 0],
  send_packs: ['garage', 'Load the battery packs on the drone', 4, 6], full_video: ['dish', 'Point the dish at the relay orbiter', 3, 5], text_only: ['dish', 'Point the dish at the relay orbiter', 3, 5],
  ask_again: ['dish', 'Send the question from the dish', 3, 5], ask_earth: ['dish', 'Send the question from the dish', 3, 5], photos_to_earth: ['dish', 'Send the photos from the dish', 3, 5], send: ['comms', 'Send the storm report', 2, 0],
};

export class FPMode {
  on = false;
  fp: FirstPerson;
  interiors: Interiors;
  drive: RoverDrive;
  private lastSol = -1; private rewardSol = -1;
  private m: Mission | null = null;
  private page = h('div', { class: 'tab-page' });
  private received: Line[][] = [];
  private st: Record<string, Station> = {};
  private tick = 0;

  constructor(private world: World, private ui: UI, play: (s: string) => void, hands: THREE.Object3D | null = null) {
    this.fp = new FirstPerson(world, ui.root, play, hands);
    this.interiors = new Interiors((x, z) => world.terrain.heightAt(x, z));
    this.interiors.group.visible = false; world.scene.add(this.interiors.group);
    for (const z of this.interiors.zones) this.fp.addZone(z);
    this.fp.stations = this.interiors.stations;
    for (const s of this.interiors.stations) this.st[s.id] = s;
    this.fp.onDoor = (s) => {
      if (s.id.startsWith('door:exit:')) { const z = this.interiors.zones.find((q) => q.id === s.id.slice(10))!; void this.fp.teleport(z.exit[0], z.exit[1], Math.PI, 'outside'); }
      else { const id = s.id.slice(5), e = ENTRY[id]; void this.fp.teleport(e[0], e[1], 0, id); }
    };
    this.drive = new RoverDrive(world, this.fp, ui.root, play);
    this.fp.extraPrompt = () => this.drive.prompt();
    this.drive.onDeliver = (site) => {
      const m = this.m; if (!m) return;
      if (this.rewardSol !== m.s.sol) { this.rewardSol = m.s.sol; m.s.food = Math.min(100, m.s.food + 5); m.s.water = Math.min(100, m.s.water + 5); ui.toast(`Supplies delivered: ${site.what}. ${site.reward}`, 4200); this.sync(m); }
      else ui.toast('Delivered! (Supplies count once per sol. Drive for a better time!)', 3600);
    };
    this.fp.tablet.content.append(this.page);
    this.fp.tablet.onTab = () => this.renderTab();
    this.fp.onO2Empty = () => { void this.fp.teleport(ENTRY.command[0], ENTRY.command[1], 0, 'command'); if (this.m) this.m.s.health = Math.max(1, this.m.s.health - 5); ui.toast('Suit oxygen ran out. Kofi pulled you back inside.'); };
  }

  start(m: Mission) {
    this.on = true; this.m = m; this.received = [];
    this.interiors.group.visible = true;
    this.fp.tablet.content.append(this.ui.layer); this.ui.overlayRoot = this.fp.tablet.screen;
    this.fp.o2 = 100; this.fp.zone = 'command'; this.fp.pos.set(-2.2, 0, -35.6); this.fp.yaw = -0.9;
    this.fp.enable(!m.diff.timers);
    this.drive.setOn(true); this.drive.park(); this.lastSol = m.s.sol;
    this.sync(m);
  }
  stop() {
    if (!this.on) return; this.drive.setOn(false); this.on = false; this.m = null; this.fp.disable(); this.interiors.group.visible = false;
    this.ui.root.append(this.ui.layer); this.ui.overlayRoot = this.ui.root; this.fp.tabletLocked = false;
  }
  /** Cutscenes take the camera away for a moment. */
  cinematic(on: boolean) { if (!this.on) return; if (on) { this.drive.exit(true); this.fp.active = false; this.world.external = false; document.body.classList.remove('fp'); document.exitPointerLock?.(); this.fp.tablet.raise(false); } else { this.fp.active = true; this.world.external = true; document.body.classList.add('fp'); } }

  // ------------------------------------------------------------ what the mission loop asks for

  async wake() { await this.fp.teleport(-2.2, -35.6, -0.9, 'command'); }
  /** Walk to the place for this scene, then the tablet comes up. */
  async at(scene: string, text: string) { const s = this.st[SCENE_STATION[scene] ?? scene] ?? this.st.table; await this.fp.goTo(s, text); this.open(); }
  open() { this.fp.tabletLocked = true; this.fp.tablet.setBusy(true); this.fp.toggleTablet(true); }
  close() { this.ui.clear(); this.fp.tabletLocked = false; this.fp.tablet.setBusy(false); this.renderTab(); this.fp.toggleTablet(false); }
  /** After a choice, do the job it implies with your own hands. */
  async job(choiceId: string) { const j = JOBS[choiceId]; if (!j || !this.st[j[0]]) return; await this.fp.task(this.st[j[0]], j[1], j[2] * (this.fp.cadet ? 0.7 : 1), j[3]); }
  async toShelter() { this.fp.storm = 1; await this.fp.goTo(this.st.shelter, 'The storm is here. Get inside the shelter!'); }
  messages(msgs: Line[][]) { this.received.push(...msgs); }

  // ------------------------------------------------------------ tablet tabs and physical screens

  sync(m: Mission) {
    this.m = m; const s = m.s, d = dayOf(m), g = d.game;
    if (s.sol !== this.lastSol) { this.lastSol = s.sol; this.drive.park(); }
    const pct = Math.min(100, Math.round((Math.max(s.dose, s.doseDil) / m.diff.dose.red) * 100));
    this.fp.tablet.status.innerHTML = `<b>SOL ${s.sol}/${BAL.missionSols}</b><span>${icon('air', 'var(--ui-air)')} ${Math.round(s.air)}</span><span>${icon('power', 'var(--ui-power)')} ${Math.round(s.power / 10)} cells</span><span>${icon('shield', 'var(--ui-shield)')} ${Math.round(s.shield)}</span><span>${icon('badge', pct > 70 ? 'var(--ui-warn)' : 'var(--ui-ok)')} badge ${pct}%</span><em>${m.cfg.live ? 'LIVE SPACE WEATHER' : 'REAL DATA · ARCHIVED'}</em>`;
    this.fp.doseRate = g.stormLevel >= 2 && s.flags.stormDone !== true ? d.rad?.maxRate ?? g.doseOutside / 24 : d.rad?.meanRate ?? g.doseOutside / 24;
    this.fp.storm = g.stormLevel >= 2 ? Math.max(this.fp.storm, 0.6) : 0;
    this.renderTab();
    this.screens();
  }
  private screens() {
    const m = this.m; if (!m) return; const s = m.s, d = dayOf(m), a = s.alloc;
    const data: ScreenData = { sol: s.sol, air: s.air, power: s.power, shield: s.shield, need: shieldNeed(m) || 90, alloc: [a.life, a.garden, a.shield, a.rover], solar: m.today.solar, doseRate: this.fp.doseRate, calmRate: d.game.doseCalm / 24, dose: s.dose, limit: m.diff.dose.red, storm: d.game.stormLevel, delay: d.orbit.lightMinutes, inbox: s.inbox.length, realDate: d.date, live: !!m.cfg.live };
    this.interiors.update(data, THREE.MathUtils.clamp(s.power / 40, 0.15, 1));
  }
  private room = '';
  frame(dt: number) { this.fp.update(dt); this.drive.frame(dt, this.world.time); if (this.fp.zone !== this.room) { this.room = this.fp.zone; this.interiors.setRoom(this.room); } this.tick += dt; if (this.tick > 0.5) { this.tick = 0; this.screens(); } }

  private renderTab() {
    const m = this.m; if (!m) return; const s = m.s, d = dayOf(m), g = d.game, t = tokens(m), dv = derived(m);
    const row = (k: string, v: string, col = '') => `<div class="row2"><span>${k}</span><b style="color:${col}">${v}</b></div>`;
    const meter = (label: string, v: number, col: string, note = '') => `<div class="meter"><span>${label}</span><i><u style="width:${Math.max(0, Math.min(100, v))}%;background:${col}"></u></i><b>${Math.round(v)}%</b><em>${note}</em></div>`;
    const lv = ['Off', 'Low', 'Normal', 'Boost'];
    let html = '';
    switch (this.fp.tablet.tab) {
      case 'power': html = `<h3>Power routing</h3>${meter('Battery', s.power, 'var(--ui-power)', `${Math.round(s.power)} kWh stored`)}${row("Today's sunlight", `${Math.round(m.today.solar / 10)} cells`)}${row('Heat, lights, computers', `${Math.round(m.diff.baseLoad / 10)} cells (always on)`)}<h4>Machines right now</h4>${row('Air Maker', lv[s.alloc.life], 'var(--ui-air)')}${row('Greenhouse', lv[s.alloc.garden], 'var(--ui-food)')}${row('Storm Shield', lv[s.alloc.shield], 'var(--ui-shield)')}${row('Rover and drill', lv[s.alloc.rover])}<p class="note">To change the routing, use the power board on the command deck each morning.</p>`; break;
      case 'life': html = `<h3>Life support</h3>${meter('Air reserve', s.air, 'var(--ui-air)', `${(s.air * BAL.units.airPointKgO2).toFixed(1)} kg of oxygen`)}${meter('Water', s.water, 'var(--ui-water)')}${meter('Food', s.food, 'var(--ui-food)')}${meter('Crew health', s.health, '#ff9db0')}${meter('Your suit oxygen', this.fp.o2, 'var(--ui-air)', 'refills inside the habitat')}<p class="note">Each person needs about 0.84 kg of oxygen a day (life-support planning value).</p>`; break;
      case 'shield': html = `<h3>Shielding</h3>${meter('Storm Shield charge', s.shield, 'var(--ui-shield)', g.stormLevel ? `this storm needs ${shieldNeed(m)}%` : 'no storm right now')}${row('Radiation outside today', `${Math.round(g.doseOutside)} µGy ${g.radSource === 'measured' ? '(measured on Mars by Curiosity)' : '(estimated)'}`)}${row('A calm day', `${Math.round(g.doseCalm)} µGy`)}${meter('Crew radiation badge', (s.dose / m.diff.dose.red) * 100, 'var(--ui-warn)', `${Math.round(s.dose)} µGy`)}${meter("Dil's badge", (s.doseDil / m.diff.dose.red) * 100, 'var(--ui-warn)', `${Math.round(s.doseDil)} µGy`)}<p class="note">Biggest solar flare in the space-weather record for this day: ${t.flareMax}. ${d.marsArrivals?.length ? 'The forecast model has a solar cloud reaching Mars today.' : ''}</p>`; break;
      case 'garden': html = `<h3>Greenhouse</h3>${s.flags.plantsDead ? '<p class="note">The greenhouse is dark. Nothing in it is alive.</p>' : meter('Garden', s.plants, 'var(--ui-food)', dv.gardenTier === 2 ? 'thriving' : 'growing')}${row('Harvests', String(s.harvests))}${row('Lights', lv[s.alloc.garden], 'var(--ui-food)')}<h4>Ana's plants</h4><div class="chips">${(crewJson as any).plants.beds.map((b: any) => `<span><b>${b.name}</b> ${b.crop}</span>`).join('')}</div>`; break;
      case 'comms': html = `<h3>Comms with Earth</h3>${row('Radio delay, one way', `${d.orbit.lightMinutes} minutes`)}${row('Distance to Earth', `${d.orbit.distanceMillionKm} million km`)}${row('Messages in flight', String(s.inbox.length))}${row('Broken message', `${Math.min(3, s.fragments)} of 3 pieces`)}<h4>Received</h4>${this.received.length ? this.received.slice(-3).map((msg) => msg.map((l) => `<p class="msg"><b>${CREW[l.who]?.shortName ?? ''}</b> ${l.say}</p>`).join('')).join('') : '<p class="note">Nothing yet. Ask Earth a question from the comms dish; the answer arrives a sol later.</p>'}`; break;
      case 'crew': html = `<h3>Crew</h3>${meter('Morale', s.morale, '#ffd27a')}<div class="cards">${(crewJson as any).crew.filter((c: any) => c.onMars && c.id !== 'pip').map((c: any) => `<div><b style="color:${c.color}">${c.name}</b><i>${c.role}</i><span>${c.id === 'dil' ? (s.flags.dilInField ? 'In the field with the rover' : s.flags.sampleSecured ? 'Home, core in the cold box' : 'At the outpost') : c.loves}</span></div>`).join('')}</div>${row('Leopard Core', s.flags.sampleSecured ? 'Secured' : `${Math.round(s.science)}%`)}`; break;
      default: html = `<h3>Mission science log</h3><p class="note">Every storm and radiation number in this mission is real space data. The log explains each dataset and what the game simplified.</p><button class="btn primary" id="tab-log">Open the science log</button>`;
    }
    this.page.innerHTML = html;
    this.page.querySelector('#tab-log')?.addEventListener('click', () => this.onLog());
  }
  onLog: () => void = () => {};
}
