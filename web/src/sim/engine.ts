// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
/**
 * engine.ts — the pure mission simulation. No rendering, no DOM, no network.
 * Rules: shared/GAME_BIBLE.md §15 and shared/design/SCHEMA.md. Numbers: shared/design/balance.json.
 * The Unity edition ports this file 1:1.
 *
 * Flow per sol:  startSol() → setAlloc() → solEvents() → choose()… → endSol()
 */
import balanceJson from '@shared/design/balance.json';
import eventsJson from '@shared/design/events.json';
import endingsJson from '@shared/design/endings.json';
import dialogueJson from '@shared/design/dialogue.json';
import { mulberry32, type Rng } from './rng';

export const BAL: any = balanceJson;
export const EVENTS: any[] = (eventsJson as any).events;
export const ENDINGS: any[] = (endingsJson as any).endings;
export const DLG: any = dialogueJson;

export type SystemId = 'life' | 'garden' | 'shield' | 'rover';
export type Alloc = Record<SystemId, number>;
export type DifficultyId = 'cadet' | 'commander' | 'classroom';
export type Sky = 'clear' | 'haze' | 'dust' | 'deepDust';
export interface Line { who: string; say: string }

export interface State {
  sol: number;
  air: number; power: number; shield: number;
  water: number; food: number;
  plants: number; science: number; health: number; morale: number;
  dose: number; doseDil: number;
  risk: number; harvests: number; fragments: number; earthAsks: number; forecastsShown: number;
  blackoutSols: number;
  flags: Record<string, boolean>;
  alloc: Alloc;
  mods: { id: string; target: string; add: number; solsLeft: number }[];
  pending: { sol: number; effects: any[]; because?: string }[];
  inbox: { sol: number; key: string }[];
  log: { sol: number; kind: string; text: string }[];
  seen: Record<string, boolean>;
  history: { sol: number; air: number; power: number; shield: number; plants: number; science: number; dose: number; doseDil: number; doseOutside: number }[];
  ended: string | null;
}

export interface MissionConfig {
  difficulty: DifficultyId;
  seed: number;
  windowId: string;
  days: any[];            // exactly missionSols real day summaries (shared/design/SCHEMA.md §5)
  live?: boolean;
  history?: boolean;
  injectedStorm?: boolean; // sols 8–9 replay the archived May 2024 storm (calm live window)
}

export interface Mission {
  cfg: MissionConfig;
  diff: any;
  s: State;
  rng: Rng;
  dust: { start: number; length: number };
  today: { sky: Sky; solar: number; queued: Line[]; stormChoice?: string; diverted?: boolean; shortfall?: boolean; gotFragment?: number };
}

const METERS = ['air', 'power', 'shield', 'water', 'food', 'plants', 'science', 'health', 'morale'] as const;
const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const SYS = BAL.systems;
const RADB = BAL.radiation;

export function difficulty(id: DifficultyId): any {
  const d = BAL.difficulty[id];
  return d.inherits ? { ...BAL.difficulty[d.inherits], ...d } : d;
}

// ------------------------------------------------------------------ setup

export function newMission(cfg: MissionConfig): Mission {
  const diff = difficulty(cfg.difficulty);
  const rng = mulberry32(cfg.seed >>> 0);
  const pick = (a: number[]) => a[Math.floor(rng() * a.length)];
  const dust = { start: pick(BAL.dust.startSol), length: pick(BAL.dust.lengthSols) };
  const s: State = {
    sol: 1, ...diff.start,
    dose: 0, doseDil: 0, risk: 0, harvests: 0, fragments: 0, earthAsks: 0, forecastsShown: 0, blackoutSols: 0,
    flags: {}, alloc: { ...diff.defaultAlloc }, mods: [], pending: [], inbox: [], log: [], seen: {}, history: [], ended: null,
  };
  if (cfg.live) s.flags.liveData = true;
  if (cfg.history) s.flags.historyMission = true;
  if (cfg.days.some((d) => d.game.flareLevel >= 2)) s.flags.sawXFlare = true;
  return { cfg, diff, s, rng, dust, today: { sky: 'clear', solar: 0, queued: [] } };
}

export const dayOf = (m: Mission, sol = m.s.sol) => m.cfg.days[Math.min(sol, m.cfg.days.length) - 1];

export function skyFor(m: Mission, sol: number): Sky {
  const { start, length } = m.dust;
  const profile: Sky[] = length === 2 ? BAL.dust.profile2 : BAL.dust.profile3;
  if (sol >= start && sol < start + length) return profile[sol - start];
  if (sol >= start + length && sol < start + length + BAL.dust.afterHazeSols) return 'haze';
  return 'clear';
}

const modSum = (m: Mission, target: string) => m.s.mods.filter((x) => x.target === target).reduce((a, x) => a + x.add, 0);

// ------------------------------------------------------------------ conditions and effects

export function derived(m: Mission) {
  const s = m.s, f = s.flags, E = BAL.endings;
  const gardenTier = f.plantsDead ? 0 : s.harvests >= 1 || s.plants >= E.gardenThrivingPlants ? 2 : 1;
  const crewFit = !f.sentHome && s.health >= E.crewFitHealth ? 1 : 0;
  const highRisk = s.risk >= E.highRiskCount || f.shieldFailed || f.dilGrounded || f.anyAmber ? 1 : 0;
  const decoded = s.fragments >= E.decodedFragments ? 1 : 0;
  return { gardenTier, crewFit, highRisk, decoded };
}

export function swValue(m: Mission, key: string): number {
  const d = dayOf(m);
  if (key === 'hasForecast') return forecastFor(m) ? 1 : 0;
  return Number(d.game[key] ?? 0);
}

function cmp(v: number, c: any): boolean {
  if (c.gte !== undefined && !(v >= c.gte)) return false;
  if (c.gt !== undefined && !(v > c.gt)) return false;
  if (c.lte !== undefined && !(v <= c.lte)) return false;
  if (c.lt !== undefined && !(v < c.lt)) return false;
  if (c.eq !== undefined && !(v === c.eq)) return false;
  return true;
}

export function test(m: Mission, c: any): boolean {
  if (!c) return true;
  if (c.all) return c.all.every((x: any) => test(m, x));
  if (c.any) return c.any.some((x: any) => test(m, x));
  if (c.not) return !test(m, c.not);
  if (c.flag !== undefined) return !!m.s.flags[c.flag] === (c.is === undefined ? true : c.is);
  if (c.sol) return cmp(m.s.sol, c.sol);
  if (c.sw !== undefined) return cmp(swValue(m, c.sw), c);
  if (c.mode !== undefined) return m.cfg.difficulty === c.mode;
  if (c.v !== undefined) {
    const d: any = derived(m);
    const v = c.v in d ? d[c.v] : Number((m.s as any)[c.v] ?? 0);
    return cmp(v, c);
  }
  return true;
}

export interface Landed { because?: string; changes: Record<string, number> }

/** Apply effects; returns what changed (for the UI) and queues crew lines. */
export function apply(m: Mission, effects: any[] | undefined, changes: Record<string, number> = {}): Record<string, number> {
  const s = m.s as any;
  for (const e of effects || []) {
    if (e.if) { apply(m, test(m, e.if) ? e.do : e.else, changes); continue; }
    if (e.chance !== undefined) { apply(m, m.rng() < e.chance ? e.do : e.else, changes); continue; }
    if (e.after !== undefined && e.do) { m.s.pending.push({ sol: m.s.sol + e.after, effects: e.do, because: e.because }); continue; }
    if (e.msg) { m.s.inbox.push({ sol: m.s.sol + (e.after ?? 1), key: e.msg }); continue; }
    if (e.v !== undefined) {
      const before = Number(s[e.v] ?? 0);
      let next = e.set !== undefined ? e.set : before + e.add;
      if ((METERS as readonly string[]).includes(e.v)) next = clamp(next);
      s[e.v] = next;
      changes[e.v] = (changes[e.v] ?? 0) + (next - before);
      continue;
    }
    if (e.flag !== undefined) { m.s.flags[e.flag] = e.set !== false; continue; }
    if (e.mod) { m.s.mods = m.s.mods.filter((x) => x.id !== e.id); m.s.mods.push({ id: e.id, target: e.mod, add: e.add, solsLeft: e.sols }); continue; }
    if (e.clearMod) { m.s.mods = m.s.mods.filter((x) => x.id !== e.clearMod); continue; }
    if (e.log) { m.s.log.push({ sol: m.s.sol, kind: e.kind || 'turn', text: e.log }); continue; }
    if (e.say) { m.today.queued.push({ who: e.say, say: e.text }); continue; }
    if (e.end) { m.s.flags[e.end] = true; m.s.ended = e.end; continue; }
  }
  return changes;
}

// ------------------------------------------------------------------ text tokens

export function forecastFor(m: Mission): { sol: number; speed: number; glancing: boolean; link: string } | null {
  const d = dayOf(m);
  let best: any = null;
  for (const f of d.marsForecasts || []) {
    const dd = Math.round((Date.parse(f.arrival.slice(0, 10)) - Date.parse(d.date)) / 86400000);
    const sol = m.s.sol + dd;
    if (dd < 1 || sol > BAL.missionSols) continue;
    if (!best || sol < best.sol) best = { sol, speed: f.cmeSpeed ?? 0, glancing: !!f.glancing, link: f.link };
  }
  return best;
}

export function tokens(m: Mission): Record<string, string> {
  const d = dayOf(m), s = m.s, fc = forecastFor(m);
  const need = RADB.shieldRequired[d.game.stormLevel] || RADB.shieldRequired[1];
  const calm = d.game.doseCalm || 1;
  const real = new Date(d.date + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  return {
    sol: String(s.sol), shield: String(Math.round(s.shield)), need: String(need),
    flareMax: d.flares.max ?? 'none', realDate: real,
    delayMin: String(Math.round(d.orbit.lightMinutes)),
    roundTripMin: String(Math.round(d.orbit.lightMinutes * 2)),
    fcSol: fc ? String(fc.sol) : '-', fcSpeed: fc ? String(Math.round(fc.speed)) : '-',
    fcKind: fc ? (fc.glancing ? 'a glancing blow' : 'a direct hit') : '-',
    doseToday: String(Math.round(d.game.doseOutside)), calmDose: String(Math.round(calm)),
    ratio: (d.game.doseOutside / calm).toFixed(1), kp: String(d.earth.kpMax ?? '-'),
  };
}
export const fill = (text: string, t: Record<string, string>) => text.replace(/\{(\w+)\}/g, (_, k) => t[k] ?? `{${k}}`);

// ------------------------------------------------------------------ dawn

export interface DawnReport {
  sol: number; sky: Sky; solar: number; available: number;
  notes: string[]; landed: Landed[]; messages: Line[][]; stormLevel: number; flareLevel: number;
}

export function startSol(m: Mission): DawnReport {
  const s = m.s, d = dayOf(m), D = DLG.dawn, t = tokens(m);
  m.today = { sky: skyFor(m, s.sol), solar: 0, queued: [] };
  const notes: string[] = [], landed: Landed[] = [], messages: Line[][] = [];
  const sky = m.today.sky;
  const prevSky = s.sol > 1 ? skyFor(m, s.sol - 1) : 'clear';
  const stormy = (k: Sky) => k === 'dust' || k === 'deepDust';

  s.flags.dustStartsToday = s.sol === m.dust.start;
  s.flags.dustStorm = stormy(sky);
  if (stormy(prevSky) && !stormy(sky)) {
    notes.push(D.dustEnds);
    s.flags.panelsDusty = true;
    s.mods.push({ id: 'dustyPanels', target: 'solar', add: BAL.dust.dustyPanelsPenalty, solsLeft: 99 });
  }
  notes.push(D[sky]);
  if (s.flags.panelsDusty) notes.push(D.panelsDusty);

  // Dil's travels
  if (s.flags.dilComingHome) {
    s.flags.dilComingHome = false; s.flags.dilInField = false; s.flags.dilReturned = true;
    if (s.flags.dilStranded) {
      s.flags.dilStranded = false;
      landed.push({ because: DLG.because.roverFlat, changes: apply(m, [{ v: 'power', add: BAL.storm.rescueCost.power }, { v: 'health', add: BAL.storm.rescueCost.health }]) });
    }
    if (s.science >= BAL.story.coreSealedAtScience && !s.flags.sampleLost) {
      s.flags.sampleSecured = true;
      notes.push(D.dilHome);
      s.log.push({ sol: s.sol, kind: 'win', text: 'Dil came home with the Leopard Core.' });
    }
  } else if (s.flags.dilInField) notes.push(D.dilAway);

  // delayed consequences
  for (const p of s.pending.filter((x) => x.sol <= s.sol)) landed.push({ because: p.because, changes: apply(m, p.effects) });
  s.pending = s.pending.filter((x) => x.sol > s.sol);
  // messages from Earth
  for (const i of s.inbox.filter((x) => x.sol <= s.sol)) {
    const msg: Line[] = (DLG.earth[i.key] || DLG.earth['earth.generic']).map((l: Line) => ({ ...l, say: fill(l.say, t) }));
    // every answer from Earth carries one more piece of the broken message
    if (s.fragments < BAL.endings.decodedFragments) {
      msg.push({ who: 'pip', say: DLG.fragments.intro + ' ' + DLG.fragments.pieces[s.fragments] });
      s.fragments++;
      if (s.fragments >= BAL.endings.decodedFragments) msg.push({ who: 'pip', say: DLG.fragments.complete });
    }
    messages.push(msg);
  }
  s.inbox = s.inbox.filter((x) => x.sol > s.sol);

  // real space weather
  const g = d.game;
  if (g.flareLevel >= 1) notes.push(fill(D['flare' + g.flareLevel], t));
  if (g.radioNoise >= 1) notes.push(D['radio' + g.radioNoise]);
  if ((d.earth.kpMax ?? 0) >= 7) notes.push(fill(D.earthAurora, t));
  if (d.marsArrivals?.length && g.stormLevel === 0) notes.push(fill(D.cloudArrives, t));
  if (g.stormLevel >= 1 && s.flags.stormDone) notes.push(fill(D.stormContinues, t));
  if (g.stormLevel === 0 && s.sol > 1 && dayOf(m, s.sol - 1).game.stormLevel >= 1) notes.push(D.stormOver);
  // a fair clue one sol before a severe storm
  if (s.sol < BAL.missionSols && dayOf(m, s.sol + 1).game.stormLevel >= 3) notes.push(D.sunspot);
  if (s.flags.plantsDead) notes.push(D.plantsDead);
  else if (s.plants < 25) notes.push(D.plantsLow);

  m.today.solar = Math.max(0, m.diff.solar[sky] + modSum(m, 'solar'));
  return { sol: s.sol, sky, solar: m.today.solar, available: available(m), notes, landed, messages, stormLevel: g.stormLevel, flareLevel: g.flareLevel };
}

// ------------------------------------------------------------------ power board

export const baseLoad = (m: Mission) => m.diff.baseLoad + modSum(m, 'baseLoad');
/** Points the player may spend today: stored battery + today's sun − base load. */
export const available = (m: Mission) => Math.max(0, Math.floor(m.s.power + m.today.solar - baseLoad(m)));
export const allocCost = (a: Alloc) => (Object.keys(a) as SystemId[]).reduce((sum, k) => sum + SYS[k].cost[a[k]], 0);
export const canAfford = (m: Mission, a: Alloc) => allocCost(a) <= available(m);

/** What tonight will do with this allocation (shown as arrows on the power board). */
export function preview(m: Mission, a: Alloc) {
  const s = m.s;
  const growing = !s.flags.plantsDead;
  const roverWorks = !s.flags.sampleSecured && !s.flags.sampleLost && !s.flags.dilGrounded && s.science < 100;
  let plants = growing ? SYS.garden.plants[a.garden] + (a.garden >= 1 ? modSum(m, 'plantsDrift') : 0) : 0;
  if (plants > 0 && s.water < BAL.supplies.lowWaterThreshold) plants *= BAL.supplies.lowWaterPlantsFactor;
  return {
    power: m.today.solar - baseLoad(m) - allocCost(a),
    air: SYS.life.air[a.life] + modSum(m, 'airDrift') + (growing && s.plants >= SYS.garden.airBonusNeedsPlants ? SYS.garden.airBonus[a.garden] : 0),
    plants,
    shield: SYS.shield.shield[a.shield] + (a.shield >= 1 ? modSum(m, 'shieldRate') : 0),
    science: roverWorks && a.rover >= 1 ? Math.max(0, SYS.rover.science[a.rover] + modSum(m, 'scienceRate')) : 0,
    water: BAL.supplies.waterPerSol + (growing ? SYS.garden.water[a.garden] : 0) + modSum(m, 'waterDrift'),
  };
}

export function setAlloc(m: Mission, a: Alloc): boolean {
  if (!canAfford(m, a)) return false;
  m.s.alloc = { ...a };
  // cold night: battery plus today's sun cannot even pay the base load (heat, lights)
  m.today.shortfall = m.s.power + m.today.solar - baseLoad(m) < 0;
  m.s.power = clamp(m.s.power + m.today.solar - baseLoad(m) - allocCost(a));
  return true;
}

/** The highest affordable version of an allocation (used for defaults and bots). */
export function fitAlloc(m: Mission, want: Alloc, dropOrder: SystemId[] = ['rover', 'shield', 'garden', 'life']): Alloc {
  const a = { ...want };
  let guard = 20;
  while (!canAfford(m, a) && guard-- > 0) {
    const k = dropOrder.find((x) => a[x] > 0) ?? dropOrder[0];
    if (a[k] === 0) break;
    a[k]--;
  }
  return a;
}

// ------------------------------------------------------------------ events

export interface EventInst { def: any; lines: Line[]; learn?: string; note: boolean; steps?: any[] }

const eligible = (m: Mission, e: any) => {
  if (m.s.seen[e.id] && !e.cooldownSols) return false;
  if (e.cooldownSols && m.s.sol - ((m.s as any).lastFired?.[e.id] ?? -99) < e.cooldownSols) return false;
  if (e.sol !== undefined && e.sol !== null && e.sol !== m.s.sol) return false;
  return test(m, e.when);
};
const inst = (m: Mission, e: any): EventInst => {
  const t = tokens(m);
  const fx = (ls?: Line[]) => (ls || []).map((l) => ({ ...l, say: fill(l.say, t) }));
  return { def: e, lines: fx(e.kind === 'crisis' ? e.intro : e.lines), learn: e.learn ? fill(e.learn, t) : undefined, note: !!e.note, steps: e.steps?.filter((st: any) => test(m, st.when)) };
};

/** Events for this sol, in play order. Notes (no choice) are applied here. Call once per sol, after setAlloc. */
export function solEvents(m: Mission): EventInst[] {
  const s = m.s;
  s.flags.harvestToday = !!s.flags.harvestPending;
  s.flags.harvestPending = false;
  const out: EventInst[] = [];
  const fixed = EVENTS.filter((e) => e.kind !== 'deck' && eligible(m, e)).sort((a, b) => (b.priority ?? 50) - (a.priority ?? 50));
  for (const e of fixed.filter((x) => x.note)) { s.seen[e.id] = true; out.push(inst(m, e)); apply(m, e.effects); }
  const choices = fixed.filter((x) => !x.note);
  const excl = choices.find((x) => x.exclusive);
  const max = (eventsJson as any).maxChoiceEventsPerSol;
  const picked = excl ? [excl] : choices.slice(0, max);
  if (!excl && picked.length < max) {
    const deck = EVENTS.filter((e) => e.kind === 'deck' && eligible(m, e));
    const total = deck.reduce((a, e) => a + (e.weight ?? 10), 0);
    if (total > 0) {
      let r = m.rng() * total;
      const d = deck.find((e) => (r -= e.weight ?? 10) < 0) ?? deck[deck.length - 1];
      picked.push(d);
    }
  }
  for (const e of picked) { s.seen[e.id] = true; ((s as any).lastFired ??= {})[e.id] = s.sol; out.push(inst(m, e)); }
  return out;
}

export function choiceState(m: Mission, c: any): { ok: boolean; why?: string } {
  if (c.needs && !test(m, c.needs)) return { ok: false, why: c.needsText || 'Not possible right now' };
  let cost = c.askEarth ? BAL.cell.points : 0;
  for (const e of c.effects || []) if (e.v === 'power' && e.add < 0) cost -= e.add;
  if (cost > 0 && m.s.power < cost) return { ok: false, why: `Needs ${Math.round(cost / BAL.cell.points)} power cell${cost > BAL.cell.points ? 's' : ''}` };
  return { ok: true };
}

export interface ChoiceResult { lines: Line[]; changes: Record<string, number> }

/** Apply a choice of a normal event, or of one step of the storm crisis. */
export function choose(m: Mission, def: any, choiceId: string, stepId?: string): ChoiceResult {
  const holder = stepId ? def.steps.find((x: any) => x.id === stepId) : def;
  const c = holder.choices.find((x: any) => x.id === choiceId);
  const changes: Record<string, number> = {};
  m.today.queued = [];
  if (c.askEarth) { apply(m, [{ v: 'power', add: -BAL.cell.points }, { v: 'earthAsks', add: 1 }], changes); if (!(c.effects || []).some((e: any) => e.msg)) m.s.inbox.push({ sol: m.s.sol + 1, key: 'earth.generic' }); }
  if (c.risk) m.s.risk += c.risk;
  apply(m, c.effects, changes);
  if (def.kind === 'crisis') {
    if (stepId === 'shelter') m.today.diverted = !!m.s.flags.gardenDiverted;
    if (stepId === 'dil') m.today.stormChoice = choiceId;
  }
  const t = tokens(m);
  return { lines: [...(c.result || []), ...m.today.queued].map((l: Line) => ({ ...l, say: fill(l.say, t) })), changes };
}

// ------------------------------------------------------------------ night

export interface NightReport {
  sol: number; changes: Record<string, number>; because: string[]; lines: Line[];
  storm: null | { level: number; protection: number; doseOutside: number; doseCrew: number; doseDil: number; peakRate: number | null; peakTime: string | null; failed: boolean; measured: boolean };
  harvest: boolean; ended: string | null;
}

export function endSol(m: Mission): NightReport {
  const s = m.s, f = s.flags, d = dayOf(m), g = d.game, S = BAL.storm;
  const before: any = {}; for (const k of METERS) before[k] = (s as any)[k];
  const doseBefore = s.dose, doseDilBefore = s.doseDil;
  const because: string[] = [], lines: Line[] = [];
  const a = s.alloc;
  const p = preview(m, m.today.diverted ? { ...a, garden: 1 } : a);

  // 1 systems
  s.air = clamp(s.air + p.air);
  if (!f.plantsDead) s.plants = clamp(s.plants + (m.today.diverted ? 0 : p.plants));
  s.shield = clamp(s.shield + p.shield);
  s.water = clamp(s.water + p.water);
  const dilWorking = f.dilInField || s.science < BAL.story.dilDepartsAtScience;
  if (dilWorking && !f.dilComingHome) s.science = clamp(s.science + p.science);
  s.food = clamp(s.food + BAL.supplies.foodPerSol);
  if (a.garden === 0 && !f.plantsDead && !m.today.diverted) because.push(DLG.because.gardenDark);

  // 2 harvest / garden death
  let harvest = false;
  if (!f.plantsDead && s.plants >= 100) {
    harvest = true; s.harvests++; s.food = clamp(s.food + BAL.supplies.harvestFood); s.morale = clamp(s.morale + BAL.supplies.harvestMorale);
    s.plants = BAL.supplies.plantsAfterHarvest; f.harvestPending = true;
    s.log.push({ sol: s.sol, kind: 'win', text: 'First food harvested on Mars.' });
  }
  if (!f.plantsDead && s.plants <= 0) {
    if (f.seedsSaved && !f.replanted) { f.replanted = true; s.plants = 10; }
    else { f.plantsDead = true; s.morale = clamp(s.morale + BAL.morale.plantsDied); because.push(DLG.because.gardenDied); s.log.push({ sol: s.sol, kind: 'loss', text: 'The garden died.' }); }
  }

  // 3 radiation (real data)
  let storm: NightReport['storm'] = null;
  const level = g.stormLevel;
  let protection = 0;
  if (level >= 1) {
    protection = RADB.shieldMaxProtection * Math.min(1, s.shield / RADB.shieldRequired[level]);
    if (f.waterWall) protection = Math.min(RADB.maxProtection, protection + RADB.waterWallProtection);
  }
  const inside = g.doseCalm * RADB.habCalmFactor + g.doseStorm * RADB.habStormFactor * (1 - protection);
  s.dose += inside;
  let dilDose = inside;
  if (f.dilInField) {
    dilDose = g.doseCalm * RADB.fieldCalmFactor;
    const ch = level >= 1 ? resolveDilChoice(m) : null;
    if (ch === 'run') dilDose += g.doseStorm * (RADB.runHomeOutsideShare + (1 - RADB.runHomeOutsideShare) * RADB.habStormFactor * (1 - protection));
    else if (ch === 'cliff') dilDose += g.doseStorm * RADB.cliffStormFactor;
    else dilDose += g.doseStorm;
    lines.push(...dilLines(m, ch));
  }
  s.doseDil += dilDose;
  if (level >= 1) {
    const failed = level >= 2 && protection < RADB.shieldFailedBelowProtection;
    if (failed) f.shieldFailed = true;
    if (level >= 3) f.facedSevereStorm = true;
    s.shield = clamp(s.shield - RADB.shieldDrain[level]);
    f.stormDone = true;
    because.push(protection >= 0.8 ? DLG.because.shieldHeld : protection >= RADB.shieldFailedBelowProtection ? DLG.because.shieldThin : DLG.because.shieldEmpty);
    if (f.waterWall) because.push(DLG.because.waterWallHelped);
    lines.push(...(protection >= 0.8 ? DLG.storm['result.held'] : failed ? DLG.storm['result.failed'] : DLG.storm['result.thin']));
    storm = { level, protection, doseOutside: g.doseOutside, doseCrew: inside, doseDil: dilDose, peakRate: d.rad?.maxRate ?? null, peakTime: d.rad?.maxTime ?? null, failed, measured: g.radSource === 'measured' };
    s.log.push({ sol: s.sol, kind: failed ? 'loss' : 'turn', text: `Solar storm, level ${level}. Shelter protection ${Math.round(protection * 100)} %.` });
    f.waterWall = false;
  }
  const lim = m.diff.dose;
  if (s.dose >= lim.red && !f.sentHome) { f.sentHome = true; f.anyAmber = true; s.morale = clamp(s.morale + BAL.morale.sentHome); s.log.push({ sol: s.sol, kind: 'loss', text: 'Crew radiation badges went past the mission limit.' }); }
  else if (s.dose >= lim.amber) f.anyAmber = true;
  if (s.doseDil >= lim.amber && !f.dilGrounded) {
    f.dilGrounded = true; f.anyAmber = true;
    if (s.doseDil >= lim.red) { f.sentHome = true; lines.push(...DLG.storm['dil.sentHome']); } else lines.push(...DLG.storm['dil.grounded']);
    if (f.dilInField) f.dilComingHome = true;
    s.log.push({ sol: s.sol, kind: 'loss', text: "Dil's radiation badge went past the limit. No more field work for her." });
  }

  // 4 the core
  if (f.dilInField && s.science >= BAL.story.coreSealedAtScience && !f.sampleLost) f.dilComingHome = true;
  if (f.dilGrounded && !f.sampleSecured && s.science < BAL.story.coreSealedAtScience) { /* core stays unfinished unless a last run is possible */ }

  // 5 crew condition
  const H = BAL.health;
  let dh = H.naturalRecovery;
  if (s.air < H.veryThinAir.below) dh += H.veryThinAir.delta; else if (s.air < H.thinAir.below) { dh += H.thinAir.delta; because.push(DLG.because.lowAirTired); }
  if (m.today.shortfall) { dh += H.coldNight.delta; if (!f.plantsDead) s.plants = clamp(s.plants + H.coldNight.plants); s.blackoutSols++; because.push(DLG.because.coldNight); f.coldNight = true; }
  else { s.blackoutSols = 0; f.coldNight = false; }
  if (s.food < H.hungry.foodBelow) { dh += H.hungry.delta; s.morale = clamp(s.morale + H.hungry.morale); if (s.harvests === 0) because.push(DLG.because.noHarvestHungry); }
  if (s.water <= H.noWater.waterAtOrBelow) dh += H.noWater.delta;
  if (s.morale < H.lowMorale.below) dh += H.lowMorale.delta;
  s.health = clamp(s.health + dh);
  s.morale = clamp(s.morale + Math.sign(BAL.morale.restTarget - s.morale) * BAL.morale.drift);

  // 6 modifiers tick
  for (const x of s.mods) x.solsLeft--;
  s.mods = s.mods.filter((x) => x.solsLeft > 0);

  // 7 fail states and end of mission
  const E = BAL.endings.evac;
  s.history.push({ sol: s.sol, air: s.air, power: s.power, shield: s.shield, plants: s.plants, science: s.science, dose: s.dose, doseDil: s.doseDil, doseOutside: g.doseOutside });
  if (s.air <= E.airAtOrBelow || s.health <= E.healthAtOrBelow || s.blackoutSols >= E.blackoutSols) {
    f.evac = true;
    s.log.push({ sol: s.sol, kind: 'loss', text: s.air <= 0 ? 'The air reserve ran out.' : s.health <= 0 ? 'The crew was too worn out to go on.' : 'Two nights without power.' });
  }
  const changes: Record<string, number> = {};
  for (const k of METERS) { const dv = (s as any)[k] - before[k]; if (Math.abs(dv) > 0.01) changes[k] = dv; }
  changes.dose = s.dose - doseBefore; changes.doseDil = s.doseDil - doseDilBefore;
  if (f.evac || s.sol >= BAL.missionSols) {
    // a sealed core that is still in the field on the last sol rides home with Dil
    if (!f.evac && f.dilComingHome && s.science >= BAL.story.coreSealedAtScience && !f.sampleLost) { f.sampleSecured = true; f.dilInField = false; }
    s.ended = evaluateEnding(m);
  } else s.sol++;
  m.today.diverted = false; m.today.stormChoice = undefined;
  return { sol: s.history[s.history.length - 1].sol, changes, because: [...new Set(because)], lines, storm, harvest, ended: s.ended };
}

/** Turns the storm-step choice into what Dil actually did. Returns 'run' | 'cliff'. */
function resolveDilChoice(m: Mission): 'run' | 'cliff' {
  const s = m.s, f = s.flags, S = BAL.storm;
  let ch = m.today.stormChoice ?? 'trust';
  if (ch === 'trust') { ch = m.rng() < S.trustShelterChance ? 'cliff' : 'recall'; f.dilTrustOutcome = ch === 'cliff'; }
  if (ch === 'recall') {
    f.dilInField = false; f.dilReturned = true; f.dilRan = true;
    if (s.science >= 90) { s.science = 100; f.sampleSecured = true; } else { f.sampleLost = true; s.log.push({ sol: s.sol, kind: 'loss', text: 'Dil left the half-drilled core behind to get home.' }); }
    return 'run';
  }
  f.dilShelteredAtCliff = true; f.dilComingHome = true;
  if (s.science >= 60) s.science = 100; else s.science = clamp(s.science + 20);
  if (s.alloc.rover < 2 && m.rng() < S.strandedChance) f.dilStranded = true;
  return 'cliff';
}

function dilLines(m: Mission, ch: 'run' | 'cliff' | null): Line[] {
  if (!ch) return [];
  const f = m.s.flags, T = DLG.storm, trusted = f.dilTrusted;
  if (ch === 'run') return trusted ? T['dil.trust.run'] : f.sampleSecured ? T['dil.recalled.kept'] : T['dil.recalled.lost'];
  if (f.dilStranded) return T['dil.cliff.stranded'];
  return trusted ? T['dil.trust.shelter'] : T['dil.cliff.ok'];
}

export function evaluateEnding(m: Mission): string {
  for (const e of ENDINGS) if (test(m, e.when)) return e.id;
  return 'survival';
}

/** One-way storm helper for UI: shield % needed today. */
export const shieldNeed = (m: Mission) => RADB.shieldRequired[dayOf(m).game.stormLevel] ?? 0;
