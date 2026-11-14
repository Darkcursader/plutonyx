// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
// Balance tester: plays thousands of missions with simple "bot" strategies and reports which endings
// each one reaches. Usage: node tools/sim/run.js [design dir] [data dir] [runs]
'use strict';
const fs = require('fs'), path = require('path');
const { createMission, buildEnvironment, makeRng } = require('./sim.js');
const isMain = require.main === module;          // when imported (golden.js) ignore the command line
const designDir = (isMain && process.argv[2]) || path.join(__dirname, '../../design-draft/design');
const dataDir = (isMain && process.argv[3]) || path.join(__dirname, '../../Assets/StreamingAssets/data');
const RUNS = parseInt((isMain && process.argv[4]) || '2000', 10);
const load = (d, f) => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'));
function world(timelineId) {
  return { balance: load(designDir, 'balance.json'), crew: load(designDir, 'crew.json'), events: load(designDir, 'events.json'),
           endings: load(designDir, 'endings.json'), timeline: load(dataDir, 'timeline-' + timelineId + '.json') };
}

// ---- bots: (mission, sol info, rng) -> { answers(event), plan(), crisis(event) } ----
const pickFirst = (e) => e.choices[0].id;
const bots = {
  // does a bit of everything, shelters only when its own detector is high
  balanced: {
    answer: (m, e, r) => ({ first_light: 'panels', depot_call: 'half', zara_hunch: 'go', shelter_drill: 'drill', letters_home: 'download', seed_choice: 'greens',
                            scrubber_fault: 'repair', water_leak: 'patch', dust_front: 'hunker', little_sol: 'promise', devil_gift: 'patch_gh' }[e.id] || pickFirst(e)),
    plan: (m, info) => { const s = info.sol, st = m.state; const field = st.expedition.step < 3 && [3, 6, 9].indexOf(s) >= 0;
      const lowPower = st.battery + m.solarToday() < 75;
      return { levels: { life_support: 2, greenhouse: lowPower ? 1 : 2, comms: 1, rover: field ? 1 : 0 }, posture: 'normal',
               tasks: { ana: 'greenhouse', kenji: s % 3 === 0 ? 'dig' : 'repair', zara: field ? 'field' : (st.crew.zara.fatigue > 50 ? 'rest' : 'dig') } }; },
    crisis: (m, e) => ({ storm_field: 'cliff', storm_power: 'dark_gh' }[e.id] || pickFirst(e)),
  },
  // hides at every alert: never in the field when Earth forecasts anything
  cautious: {
    answer: (m, e) => ({ first_light: 'scrubber', depot_call: 'keep', zara_hunch: 'no', shelter_drill: 'drill', letters_home: 'later', seed_choice: 'greens',
                         scrubber_fault: 'repair', water_leak: 'patch', dust_front: 'hunker', little_sol: 'honest', devil_gift: 'patch_gh' }[e.id] || pickFirst(e)),
    plan: (m, info) => { const alert = info.report.forecast.some(f => f.sol === info.sol) || (info.report.ownDetector && info.report.ownDetector.ratio > 1.5);
      return { levels: { life_support: 2, greenhouse: 1, comms: 1, rover: 0 }, posture: alert ? 'shelter' : 'stay_close',
               tasks: { ana: 'greenhouse', kenji: 'dig', zara: 'dig' } }; },
    crisis: (m, e) => ({ storm_field: 'recall', storm_power: 'dark_gh' }[e.id] || pickFirst(e)),
  },
  // science first: field trips as early and as often as possible, no digging
  bold: {
    answer: (m, e) => ({ first_light: 'panels', depot_call: 'keep', zara_hunch: 'go', shelter_drill: 'skip', letters_home: 'later', seed_choice: 'test',
                         scrubber_fault: 'canisters', water_leak: 'bucket', dust_front: 'brush', little_sol: 'honest', devil_gift: 'leave_gh' }[e.id] || pickFirst(e)),
    plan: (m, info) => { const st = m.state, field = st.expedition.step < 3 && info.sol >= 7;
      return { levels: { life_support: 2, greenhouse: 1, comms: 0, rover: field ? 1 : 0 }, posture: 'normal',
               tasks: { ana: 'greenhouse', kenji: 'repair', zara: field ? 'field' : 'rest' } }; },
    crisis: (m, e) => ({ storm_field: 'trust', storm_power: 'both_low' }[e.id] || pickFirst(e)),
  },
  // garden first
  gardener: {
    answer: (m, e) => ({ first_light: 'panels', depot_call: 'half', zara_hunch: 'no', shelter_drill: 'drill', letters_home: 'download', seed_choice: 'greens',
                         scrubber_fault: 'repair', water_leak: 'patch', dust_front: 'brush', little_sol: 'promise', devil_gift: 'patch_gh' }[e.id] || pickFirst(e)),
    plan: (m, info) => ({ levels: { life_support: 2, greenhouse: 2, comms: 0, rover: 0 }, posture: info.sol >= 8 ? 'stay_close' : 'normal',
                          tasks: { ana: 'greenhouse', kenji: info.sol % 2 ? 'dig' : 'repair', zara: 'greenhouse' } }),
    crisis: (m, e) => ({ storm_field: 'recall', storm_power: 'ana_stays' }[e.id] || pickFirst(e)),
  },
  // knows the storm is coming (a replaying player): sample early, big battery, thick shield, antenna on
  expert: {
    answer: (m, e) => ({ first_light: 'panels', depot_call: 'half', zara_hunch: 'no', shelter_drill: 'drill', letters_home: 'later', seed_choice: 'greens',
                         scrubber_fault: 'repair', water_leak: 'patch', dust_front: 'hunker', little_sol: 'promise', devil_gift: 'patch_gh' }[e.id] || pickFirst(e)),
    plan: (m, info) => { const s = info.sol, st = m.state, field = st.expedition.step < 3 && s <= 8 && st.crew.zara.fatigue < 70;
      const frag = [2, 5, 8].indexOf(s) >= 0, save = s >= 7;
      return { levels: { life_support: 2, greenhouse: save && st.battery < 60 ? 1 : 2, comms: frag ? 1 : 0, rover: field ? 1 : 0 }, posture: s >= 9 ? 'stay_close' : 'normal',
               tasks: { ana: 'greenhouse', kenji: st.cover < 0.95 ? 'dig' : 'repair', zara: field ? 'field' : (st.cover < 0.95 ? 'dig' : 'rest') } }; },
    crisis: (m, e) => ({ storm_field: 'cliff', storm_power: 'ana_stays' }[e.id] || pickFirst(e)),
  },
  // a young child clicking around: random everything
  random: {
    answer: (m, e, r) => e.choices[r.int(e.choices.length)].id,
    plan: (m, info, r) => { const t = ['greenhouse', 'repair', 'dig', 'field', 'rest'], p = ['normal', 'normal', 'stay_close', 'shelter'];
      return { levels: { life_support: r.int(3), greenhouse: r.int(3), comms: r.int(2), rover: r.int(2) }, posture: p[r.int(4)],
               tasks: { ana: t[r.int(5)], kenji: t[r.int(5)], zara: t[r.int(5)] } }; },
    crisis: (m, e, r) => e.choices[r.int(e.choices.length)].id,
  },
  // random choices but life support always on full: "a kid who learned the first lesson"
  casual: {
    answer: (m, e, r) => e.choices[r.int(e.choices.length)].id,
    plan: (m, info, r) => { const t = ['greenhouse', 'repair', 'dig', 'field', 'rest'], p = ['normal', 'normal', 'stay_close'];
      return { levels: { life_support: 2, greenhouse: 1 + r.int(2), comms: r.int(2), rover: r.int(2) }, posture: p[r.int(3)],
               tasks: { ana: 'greenhouse', kenji: t[r.int(3)], zara: t[2 + r.int(3)] } }; },
    crisis: (m, e, r) => e.choices[r.int(e.choices.length)].id,
  },
};

function play(w, bot, seed, difficulty, trace) {
  const m = createMission(Object.assign({}, w, { env: null }), { seed, difficulty });
  const r = makeRng(seed * 7919 + 13);
  while (!m.state.over) {
    const info = m.beginSol();
    for (const e of info.events) { const c = bot.answer(m, e, r); m.choose(e.id, c); }
    const crisis = m.startSol(bot.plan(m, info, r));
    for (const e of crisis) m.choose(e.id, bot.crisis(m, e, r));
    const rep = m.finishSol();
    if (trace) { const s = rep.state; console.log(`sol ${String(s.sol).padStart(2)} ${rep.env.kind.padEnd(8)} x${rep.env.ratio.toFixed(1).padStart(4)} | bat ${s.battery.toFixed(0).padStart(3)} o2 ${s.o2.toFixed(1).padStart(4)} h2o ${s.water.toFixed(0).padStart(2)} food ${s.food.toFixed(0).padStart(2)} | gh ${s.gh_health.toFixed(0).padStart(3)}/${s.gh_growth.toFixed(0).padStart(3)} cover ${(s.cover * 100).toFixed(0).padStart(3)}% | morale ${s.morale.toFixed(0)} trust ${s.trust.toFixed(0)} | step ${s.step} frag ${s.fragments} | dose ${Object.values(s.crew).map(c => (c.dose / m.doseBudget * 100).toFixed(0) + '%').join(' ')} | ${rep.notes.join(',')}${rep.brownout.length ? ' BROWNOUT:' + rep.brownout : ''}`); }
  }
  return m.ending();
}

if (require.main === module) {
  for (const tl of ['may-2024', 'sep-2017', 'recent']) {
    const w = world(tl);
    const env = buildEnvironment(w.timeline, w.balance, makeRng(1));
    console.log(`\n===== timeline ${tl}  (sol kinds: ${env.sols.slice(1).map(e => e.kind[0] + e.ratio.toFixed(1)).join(' ')})${env.estimated ? '  [radiation ESTIMATED]' : ''}`);
    for (const difficulty of ['commander', 'cadet']) {
      console.log(`--- ${difficulty}`);
      const all = {};
      for (const name of Object.keys(bots)) {
        const counts = {};
        for (let i = 1; i <= RUNS; i++) { const e = play(w, bots[name], i * 2654435761 >>> 0, difficulty); counts[e.ending.id] = (counts[e.ending.id] || 0) + 1; all[e.ending.id] = (all[e.ending.id] || 0) + 1; }
        console.log(name.padEnd(9), Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(100 * v / RUNS).toFixed(0)}%`).join(' | '));
      }
      const missing = w.endings.endings.map(e => e.id).filter(id => !all[id]);
      console.log('reached:', Object.keys(all).length, 'of', w.endings.endings.length, missing.length ? ' NEVER REACHED: ' + missing.join(', ') : ' (all endings reachable)');
    }
  }
  console.log('\n===== trace: balanced bot, May 2024, commander, seed 42');
  const e = play(world('may-2024'), bots.balanced, 42, 'commander', true);
  console.log('ENDING:', e.ending.id, JSON.stringify(e.summary));
}
module.exports = { world, bots, play };
