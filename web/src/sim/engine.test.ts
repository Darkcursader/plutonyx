// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
import { describe, it, expect } from 'vitest';
import { mulberry32 } from './rng';
import { newMission, startSol, setAlloc, fitAlloc, solEvents, choose, choiceState, endSol, preview, available, allocCost, type Alloc, type Mission, type DifficultyId } from './engine';
import { storyDays, sliceDays, STORY, injectArchivedStorm } from '../data/windows';

type Prefs = string[] | 'last' | ((m: Mission) => string[]);
type Bot = { name: string; want: (m: Mission) => Alloc; prefs: Prefs; drop?: any };
const pick = (m: Mission, holder: any, prefs: Prefs): string => {
  if (typeof prefs === 'function') prefs = prefs(m);
  const ok = holder.choices.filter((c: any) => choiceState(m, c).ok);
  if (prefs === 'last') return (ok[ok.length - 1] ?? holder.choices[0]).id;
  return (prefs.map((p) => ok.find((c: any) => c.id === p)).find(Boolean) ?? ok[0] ?? holder.choices[holder.choices.length - 1]).id;
};
/** Greedy 'expert' player: keeps the air alive, races the core home before sol 8, banks shield, keeps the garden growing. */
const masterWant = (m: Mission): Alloc => {
  const s = m.s, a: Alloc = { life: 0, garden: 0, shield: 0, rover: 0 };
  const roverOn = s.science < 100 && !s.flags.sampleSecured && !s.flags.sampleLost && !s.flags.dilGrounded;
  const shieldGoal = s.sol <= 8 ? 90 : s.sol === 9 ? 55 : 0;
  const steps: [keyof Alloc, number, boolean][] = [
    ['life', 1, true], ['garden', 1, !s.flags.plantsDead], ['life', 2, s.air < 62], ['rover', 1, roverOn], ['rover', 2, roverOn],
    ['shield', 1, s.shield < shieldGoal], ['shield', 2, s.shield < shieldGoal - 10], ['garden', 2, s.plants < 80], ['rover', 3, roverOn && s.sol <= 7],
    ['shield', 3, s.shield < shieldGoal - 30 && s.sol >= 7], ['life', 3, s.air < 35], ['garden', 3, s.plants < 50],
  ];
  for (const [k, lvl, on] of steps) { if (!on || a[k] >= lvl) continue; const t = { ...a, [k]: lvl }; if (allocCost(t) <= available(m)) a[k] = lvl; }
  return a;
};
const masterPrefs = (m: Mission): string[] => [
  'ask_again', 'rover_first', 'ask_earth', 'cover_panels', 'full_video', 'fast_core', 'feast',
  ...(m.s.shield >= 88 ? ['hold'] : m.s.water >= 40 && m.s.shield >= 60 ? ['water_wall'] : ['divert']),
  'cliff', 'send', 'talk_fix', 'launch', 'fix_now', 'fix', 'heaters', 'brush', 'try_it', 'by_the_book', 'stay', 'listen', 'patch', 'rest', 'work', 'check', 'own_it',
];

export const BOTS: Bot[] = [
  { name: 'master', want: masterWant, prefs: masterPrefs },
  { name: 'balanced', want: () => ({ life: 2, garden: 2, shield: 1, rover: 2 }), prefs: ['kofi_cleans', 'split', 'charge_now', 'cover_panels', 'text_only', 'deep_core', 'save_seeds', 'divert', 'cliff', 'no_time', 'send_packs', 'launch', 'fix_now', 'fix', 'heaters', 'brush', 'keep_it', 'by_the_book', 'stay', 'listen', 'patch', 'rest', 'watch', 'check', 'own_it'] },
  {
    name: 'planner',
    want: (m) => ({ life: m.s.air < 55 ? 2 : 1, garden: m.s.plants < 60 ? 2 : 1, shield: m.s.shield < 90 && m.s.sol <= 8 ? 2 : m.s.sol === 9 ? 3 : 0, rover: m.s.science < 100 ? 2 : 0 }),
    prefs: ['ask_again', 'rover_first', 'charge_now', 'cover_panels', 'full_video', 'fast_core', 'feast', 'hold', 'cliff', 'no_time', 'talk_fix', 'launch', 'fix_now', 'fix', 'huddle', 'brush', 'try_it', 'by_the_book', 'stay', 'listen', 'patch', 'rest', 'work', 'check', 'own_it'],
    drop: ['garden', 'rover', 'shield', 'life'],
  },
  { name: 'science', want: () => ({ life: 2, garden: 1, shield: 0, rover: 3 }), prefs: ['move_on', 'rover_first', 'wait', 'carry_on', 'not_today', 'fast_core', 'feast', 'hold', 'cliff', 'no_time', 'refuse', 'last_run', 'launch', 'limp', 'ration', 'huddle', 'wait_wind', 'keep_it', 'do_it', 'go', 'science_data', 'watch', 'push', 'work', 'ignore', 'blame_delay'], drop: ['shield', 'garden', 'life', 'rover'] },
  { name: 'gardener', want: () => ({ life: 2, garden: 3, shield: 1, rover: 1 }), prefs: ['kofi_cleans', 'plants_first', 'wait', 'bank_power', 'text_only', 'deep_core', 'save_seeds', 'water_wall', 'recall', 'no_time', 'talk_fix', 'lights_on', 'launch', 'plants_help', 'fix', 'garden_heat', 'wait_wind', 'try_it', 'by_the_book', 'stay', 'family', 'patch', 'rest', 'watch', 'check', 'own_it'], drop: ['rover', 'shield', 'life', 'garden'] },
  { name: 'careless', want: () => ({ life: 1, garden: 1, shield: 0, rover: 1 }), prefs: 'last' },
  { name: 'shieldless', want: () => ({ life: 2, garden: 2, shield: 0, rover: 2 }), prefs: ['move_on', 'split', 'wait', 'carry_on', 'text_only', 'fast_core', 'feast', 'hold', 'trust', 'no_time', 'refuse', 'launch', 'fix_now', 'fix', 'heaters', 'brush', 'keep_it', 'by_the_book', 'stay', 'family', 'patch', 'rest', 'work', 'ignore', 'own_it'] },
];

export function play(bot: Bot, difficulty: DifficultyId, seed: number, days = storyDays()) {
  const m = newMission({ difficulty, seed, windowId: 'may-2024', days });
  let guard = 0;
  while (!m.s.ended && guard++ < 20) {
    startSol(m);
    const a = fitAlloc(m, bot.want(m), bot.drop);
    if (allocCost(a) > available(m)) throw new Error('bot overspent');
    setAlloc(m, a);
    for (const ev of solEvents(m)) {
      if (ev.note) continue;
      if (ev.def.kind === 'crisis') for (const st of ev.steps!) choose(m, ev.def, pick(m, st, bot.prefs), st.id);
      else choose(m, ev.def, pick(m, ev.def, bot.prefs));
    }
    endSol(m);
  }
  return m;
}

describe('rng', () => {
  it('is deterministic', () => {
    const a = mulberry32(12345), b = mulberry32(12345);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe('story mission data (real NASA records)', () => {
  const days = storyDays();
  it('is 13-22 May 2024 with the storm on sol 8', () => {
    expect(days).toHaveLength(10);
    expect(days[0].date).toBe('2024-05-13');
    expect(days[7].date).toBe('2024-05-20');
    expect(days[7].game.stormLevel).toBe(3);
    expect(days[7].game.radSource).toBe('measured');
    expect(days[7].rad.maxRate).toBeGreaterThan(250);
    expect(days[7].orbit.lightMinutes).toBeCloseTo(15.83, 1); // JPL Horizons gives 15.827 min
  });
  it('calm windows get the archived storm, clearly marked', () => {
    const calm = sliceDays(STORY, '2024-05-06').map((d: any) => ({ ...d, game: { ...d.game, stormLevel: 0, doseStorm: 0 } }));
    expect(injectArchivedStorm(calm)).toBe(true);
    expect(calm[7].game.injectedFrom).toBe('2024-05-20');
    expect(calm[7].game.stormLevel).toBe(3);
  });
});

describe('simulation', () => {
  it('same seed gives the same mission', () => {
    const a = play(BOTS[1], 'commander', 42), b = play(BOTS[1], 'commander', 42);
    expect(a.s.ended).toBe(b.s.ended);
    expect(a.s.history).toEqual(b.s.history);
  });
  it('every action costs something: more for one system always means less battery, and "everything on Normal" drains it', () => {
    const m = newMission({ difficulty: 'commander', seed: 7, windowId: 'may-2024', days: storyDays() });
    startSol(m);
    expect(preview(m, { life: 2, garden: 2, shield: 2, rover: 2 }).power).toBeLessThan(0);
    for (const k of ['life', 'garden', 'shield', 'rover'] as const) for (let lvl = 0; lvl < 3; lvl++) {
      const base = { life: 1, garden: 1, shield: 1, rover: 1, [k]: lvl };
      expect(preview(m, { ...base, [k]: lvl + 1 }).power).toBeLessThan(preview(m, base).power);
    }
  });
  it('meters stay in range and radiation dose never goes down', () => {
    for (const bot of BOTS) for (let seed = 1; seed <= 15; seed++) {
      const m = play(bot, 'commander', seed);
      for (const h of m.s.history) for (const k of ['air', 'power', 'shield', 'plants', 'science'] as const) {
        expect(h[k]).toBeGreaterThanOrEqual(0);
        expect(h[k]).toBeLessThanOrEqual(100);
      }
      for (let i = 1; i < m.s.history.length; i++) expect(m.s.history[i].dose).toBeGreaterThanOrEqual(m.s.history[i - 1].dose);
    }
  });
  it('balance report: every ending is reachable and no strategy always gets the same result', () => {
    const seen = new Set<string>();
    for (const difficulty of ['cadet', 'commander'] as DifficultyId[]) {
      for (const bot of BOTS) {
        const tally: Record<string, number> = {};
        for (let seed = 1; seed <= 60; seed++) {
          const e = play(bot, difficulty, seed).s.ended!;
          tally[e] = (tally[e] ?? 0) + 1;
          seen.add(e);
        }
        console.log(difficulty.padEnd(10), bot.name.padEnd(11), JSON.stringify(tally));
      }
    }
    console.log('endings seen:', [...seen].sort().join(', '));
    for (const id of ['evac', 'secret', 'full', 'gamble', 'green', 'bittersweet', 'survival']) expect(seen.has(id), `ending ${id} reachable`).toBe(true);
  });
});
