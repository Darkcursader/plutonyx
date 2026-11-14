// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
//
// REFERENCE SIMULATOR (plain JavaScript, no dependencies).
// This file is the executable definition of the game rules. The Unity edition's C# simulation
// (Assets/PlutonyX/Scripts/Core) is a line-by-line port of it, and tools/sim/golden.js writes
// "golden" runs that the C# unit tests must reproduce exactly. The Web edition can import this
// file directly. If rules change, change them here first, then in the port.
//
// Design data comes from design/*.json (balance, crew, events, endings) and one NASA timeline
// from data/timeline-*.json. Nothing here invents space weather: buildEnvironment() only bins the
// real records into mission sols.
'use strict';

// ---------- deterministic RNG (xorshift32; identical in C# with uint arithmetic) ----------
function makeRng(seed) {
  let x = (seed >>> 0) || 0x9E3779B9;
  return {
    nextUint() { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x; },
    next() { return this.nextUint() / 4294967296; },          // [0, 1)
    int(n) { return Math.floor(this.next() * n); },           // 0 .. n-1
    state() { return x; },
  };
}

function parseUtc(s) {            // "2024-05-14T16:51Z" or with seconds -> milliseconds
  if (!s) return NaN;
  let t = s.endsWith('Z') ? s.slice(0, -1) : s;
  if (t.length === 16) t += ':00';
  return Date.parse(t + 'Z');
}
const HOUR = 3600000;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const CLASS_RANK = { B: 0, C: 1, M: 2, X: 3 };

// ---------- NASA timeline -> one environment record per mission sol ----------
// timeline: data/timeline-*.json. Returns { baselineSol, sols: [null, env1, env2, ...], t0, estimated }.
function buildEnvironment(timeline, balance, rng, t0Override) {
  const m = balance.mission, rad = balance.radiation;
  const solMs = m.sol_hours * HOUR;
  const cfg = (m.timelines && m.timelines[timeline.id]) || {};
  let t0 = t0Override ? parseUtc(t0Override) : (cfg.t0_utc ? parseUtc(cfg.t0_utc) : NaN);
  if (isNaN(t0)) t0 = parseUtc(timeline.window.end) - m.sols * solMs;      // "the last N sols of the record"
  const r = timeline.radiation;
  const measured = !!(r && r.hourly_mean && r.hourly_mean.length);
  const h0 = measured ? parseUtc(r.hourly_start) : 0;
  // Quiet-time dose per sol. Without rover readings we fall back to the May 2024 quiet level.
  const baselineRate = measured ? r.baseline : rad.fallback_baseline_uGy_h;
  const baselineSol = baselineRate * m.sol_hours;
  const env = [null];
  for (let s = 1; s <= m.sols; s++) {
    const a = t0 + (s - 1) * solMs, b = t0 + s * solMs;
    const flares = timeline.flares.filter(f => { const t = parseUtc(f.peak || f.begin); return t >= a && t < b; });
    const launched = timeline.cmes.filter(c => { const t = parseUtc(c.start); return t >= a && t < b; });
    const arrivals = timeline.cmes.filter(c => { const t = parseUtc(c.mars_arrival); return c.mars_arrival && t >= a && t < b; });
    let biggest = null;
    for (const f of flares) {
      if (!biggest || CLASS_RANK[f.letter] > CLASS_RANK[biggest.letter] ||
          (CLASS_RANK[f.letter] === CLASS_RANK[biggest.letter] && f.mag > biggest.mag)) biggest = f;
    }
    let dose = 0, peakRate = 0, covered = 0;
    if (measured) {
      for (let i = 0; i < r.hourly_mean.length; i++) {
        const ha = h0 + i * HOUR, hb = ha + HOUR;
        const ov = (Math.min(b, hb) - Math.max(a, ha)) / HOUR;
        if (ov <= 0 || r.hourly_mean[i] == null) continue;
        dose += r.hourly_mean[i] * ov; covered += ov;
        if (r.hourly_max[i] != null && r.hourly_max[i] > peakRate) peakRate = r.hourly_max[i];
      }
      if (covered > 0) dose *= m.sol_hours / covered; else dose = baselineSol;   // fill small gaps
    } else {
      // ESTIMATED radiation (labelled as such in the game): quiet level, plus a storm when a fast
      // CME (>= 1000 km/s) is modelled to reach Mars this sol. The size is drawn from the factors
      // that real storms produced in Curiosity's record (balance.radiation.estimated_storm_factors).
      dose = baselineSol;
      const fast = arrivals.filter(c => (c.speed_kms || 0) >= 1000);
      if (fast.length) {
        const k = rad.estimated_storm_factors[rng.int(rad.estimated_storm_factors.length)];
        dose = baselineSol * k; peakRate = baselineRate * k * 4;
      }
    }
    const ratio = dose / baselineSol;
    const kind = ratio >= rad.severe_ratio ? 'severe' : ratio >= rad.storm_ratio ? 'storm' : ratio >= rad.elevated_ratio ? 'elevated' : 'quiet';
    env.push({ sol: s, startMs: a, endMs: b, dose, ratio, kind, peakRate, flares, biggestFlare: biggest,
               xCount: flares.filter(f => f.letter === 'X').length, launched, arrivals,
               launchedToMars: launched.filter(c => c.mars_arrival) });
  }
  return { t0, baselineSol, baselineRate, sols: env, estimated: !measured, timelineId: timeline.id };
}

// What the crew is told on the morning of sol s. Earth's forecast needs the antenna to have been
// powered the sol before; the outpost's own detector always works.
function morningReport(world, st, s) {
  const e = world.env.sols, rep = { sol: s, ownDetector: null, earthLink: s === 1 || st.commsYesterday, forecast: [], flaresYesterday: null };
  if (s > 1) rep.ownDetector = { ratio: e[s - 1].ratio, kind: e[s - 1].kind };
  if (rep.earthLink) {
    if (s > 1 && e[s - 1].biggestFlare) rep.flaresYesterday = { count: e[s - 1].flares.length, x: e[s - 1].xCount, biggest: e[s - 1].biggestFlare };
    for (let k = s; k <= Math.min(s + 2, world.balance.mission.sols); k++) {
      const known = e[k].arrivals.filter(c => parseUtc(c.start) < e[s].startMs);   // already launched = Earth can forecast it
      if (known.length) rep.forecast.push({ sol: k, count: known.length, fastest: known.reduce((a, c) => Math.max(a, c.speed_kms || 0), 0), cmes: known });
    }
  }
  return rep;
}

// ---------- mission ----------
function createMission(world, opts) {
  const B = world.balance, diff = B.difficulty[opts.difficulty || 'commander'];
  const rng = makeRng(opts.seed);
  world.env = world.env || buildEnvironment(world.timeline, B, makeRng(opts.seed ^ 0x5F3759DF), opts.t0);
  const crewIds = world.crew.crew.map(c => c.id);
  const st = {
    sol: 0, over: false, evacuated: false, evacReason: null, difficulty: opts.difficulty || 'commander', seed: opts.seed >>> 0,
    battery: diff.battery_start_kwh, o2: Math.min(B.air.o2_capacity_kg, B.air.o2_start_kg * diff.o2_start_mult),
    water: Math.min(B.water.capacity_kg, B.water.start_kg * diff.water_start_mult), food: B.food.start_crew_sols,
    gh: { health: B.greenhouse.health_start, growth: B.greenhouse.growth_start, alive: true, harvested: 0, forceLevel: -1, forceSols: 0, microgreensSol: 0, harvestFood: 0 },
    cover: B.shield.cover_start, morale: B.crew.morale_start, trust: B.crew.trust_start, science: 0, risk: 0,
    crew: {}, solarMods: [], faults: { scrubber: false, leak: false, leakRate: 0 }, flags: {},
    expedition: { step: 0, progress: 0, sample: 'none' }, fragments: 0, fragmentsMissed: 0,
    closeCalls: 0, minO2Frac: 1, stormProtectedMin: 1, sawSevere: false, commsYesterday: true,
    usedDeck: {}, pending: [], lockTask: {}, workMultToday: 1, stormOverride: null, fieldOverride: null, crewStorm: {},
    history: [], doseBudget: B.radiation.dose_budget_quiet_sols * world.env.baselineSol * diff.dose_budget_mult,
  };
  for (const id of crewIds.concat(['commander'])) st.crew[id] = { dose: 0, fatigue: 0, standdown: false };

  const ev = world.events;
  const hasFlags = (list) => !list || list.every(f => st.flags[f]);
  const noFlags = (list) => !list || !list.some(f => st.flags[f]);
  const crewName = (id) => { const c = world.crew.crew.find(x => x.id === id); return c ? c.name.split(' ')[0] : 'The crew'; };

  function applyEffects(fx, ctx) {
    if (!fx) return;
    const k = diff.event_cost_mult;
    const cost = (v) => v < 0 ? v * k : v;                       // Cadet softens costs, never gains
    if (fx.battery) st.battery = clamp(st.battery + cost(fx.battery), 0, B.power.battery_capacity_kwh);
    if (fx.o2) st.o2 = clamp(st.o2 + cost(fx.o2), 0, B.air.o2_capacity_kg);
    if (fx.water) st.water = clamp(st.water + cost(fx.water), 0, B.water.capacity_kg);
    if (fx.food) st.food = Math.max(0, st.food + cost(fx.food));
    if (fx.gh_health && st.gh.alive) st.gh.health = clamp(st.gh.health + cost(fx.gh_health), 0, 100);
    if (fx.gh_growth && st.gh.alive) st.gh.growth = clamp(st.gh.growth + fx.gh_growth, 0, 100);
    if (fx.cover) st.cover = clamp(st.cover + fx.cover, 0, 1);
    if (fx.morale) st.morale = clamp(st.morale + cost(fx.morale), 0, 100);
    if (fx.trust) st.trust = clamp(st.trust + cost(fx.trust), 0, 100);
    if (fx.science) st.science += fx.science;
    if (fx.risk) st.risk += fx.risk;
    if (fx.fatigue_all) for (const id in st.crew) st.crew[id].fatigue = clamp(st.crew[id].fatigue + fx.fatigue_all, 0, 100);
    if (fx.solar) st.solarMods.push({ mult: fx.solar.mult, sols: fx.solar.sols });
    if (fx.fault) { st.faults[fx.fault] = true; if (fx.fault === 'leak') st.faults.leakRate = 2; }
    if (fx.fix) { st.faults[fx.fix] = false; if (fx.fix === 'leak') st.faults.leakRate = 0; }
    if (fx.work_mult_today) st.workMultToday *= fx.work_mult_today;
    if (fx.lock_task) for (const id in fx.lock_task) st.lockTask[id] = fx.lock_task[id];
    if (fx.sets) for (const f of fx.sets) { st.flags[f] = true; if (f === 'microgreens') st.gh.microgreensSol = st.sol; }
    if (fx.crew) for (const id in fx.crew) crewEffect(id, fx.crew[id]);
    if (fx.crew_field && ctx && ctx.fieldIds) for (const id of ctx.fieldIds) crewEffect(id, fx.crew_field);
    if (fx.storm) st.stormOverride = Object.assign({}, fx.storm);
    if (fx.field && ctx && ctx.fieldIds) {
      const f = Object.assign({}, fx.field);
      if (f.trust_check !== undefined) {
        f.trusted = st.trust >= f.trust_check;
        if (f.trusted) { f.exposure = 'cliff_shelter'; f.complete_step = true; }
        else { f.sheltered_fraction = 0; f.complete_step = true; st.risk += 2; }
      }
      st.fieldOverride = f;
    }
  }
  function crewEffect(id, c) {
    const m = st.crew[id]; if (!m) return;
    if (c.fatigue) m.fatigue = clamp(m.fatigue + c.fatigue, 0, 100);
    if (c.dose_quiet_sols) m.dose += c.dose_quiet_sols * world.env.baselineSol;
    if (c.storm_exposure) st.crewStorm[id] = c.storm_exposure;
  }

  function eligibleDeck(s) {
    return ev.deck.filter(d => !st.usedDeck[d.id] && s >= d.sol_min && s <= d.sol_max && hasFlags(d.requires) && noFlags(d.excludes));
  }

  // Start a sol: returns the morning report and the events the player must answer before planning.
  function beginSol() {
    if (st.over) return null;
    st.sol += 1; const s = st.sol;
    st.lockTask = {}; st.workMultToday = 1; st.stormOverride = null; st.fieldOverride = null; st.crewStorm = {};
    st.pending = [];
    for (const e of ev.story) if (e.sol === s && hasFlags(e.requires) && noFlags(e.excludes)) st.pending.push(e);
    // follow-ups raised by what happened yesterday
    for (const f of ev.followups) {
      if (st.usedDeck[f.id]) continue;
      const y = s > 1 ? world.env.sols[s - 1] : null;
      let fire = false;
      if (f.trigger === 'sol_after_severe_storm') fire = !!y && y.kind === 'severe';
      else if (f.trigger === 'greenhouse_died') fire = !st.gh.alive && !st.flags.greenhouse_mourned;
      else if (f.trigger === 'forbush_decrease') fire = !!y && s >= 4 && y.ratio <= 0.9 && world.env.sols.slice(1, s).some(e => e.arrivals.length > 0);
      if (fire) { st.pending.push(f); st.usedDeck[f.id] = true; if (f.trigger === 'greenhouse_died') st.flags.greenhouse_mourned = true; }
    }
    // one dilemma from the seeded deck (an "always" card is forced on the last sol of its window)
    const pool = eligibleDeck(s);
    let pick = pool.find(d => d.always && s === d.sol_max);
    if (!pick && pool.length && s < B.mission.sols) {
      const forcedSoon = pool.filter(d => d.always);
      const weights = pool.map(d => d.always ? 2 : d.weight);
      const total = weights.reduce((a, b) => a + b, 0);
      // roughly 3 sols in 4 carry a dilemma, so quiet sols exist and the rhythm varies between runs
      if (total > 0 && rng.next() < 0.78) {
        let roll = rng.next() * total;
        for (let i = 0; i < pool.length; i++) { roll -= weights[i]; if (roll < 0) { pick = pool[i]; break; } }
        if (!pick) pick = forcedSoon[0] || pool[pool.length - 1];
      }
    }
    if (pick) { st.pending.push(pick); st.usedDeck[pick.id] = true; }
    return { sol: s, report: morningReport(world, st, s), events: st.pending.slice(), env: null };
  }

  function choose(eventId, choiceId, ctx) {
    const i = st.pending.findIndex(e => e.id === eventId);
    if (i < 0) throw new Error('no pending event ' + eventId);
    const e = st.pending[i], c = e.choices.find(x => x.id === choiceId);
    if (!c) throw new Error('no choice ' + choiceId + ' on ' + eventId);
    st.pending.splice(i, 1);
    applyEffects(c.effects, ctx || st.crisisCtx);
    let result = c.result || '';
    if (c.effects && c.effects.field && c.effects.field.trust_check !== undefined && st.fieldOverride) {
      result = st.fieldOverride.trusted
        ? '{field_name} picks the smart option: under the delta cliff, sample in hand, waiting it out.'
        : '{field_name} does not turn back. The drill keeps turning in the storm. The sample comes home, and so does a radiation reading that makes Kenji go pale.';
    }
    const names = ((ctx || st.crisisCtx || {}).fieldIds || []).map(crewName).join(' and ') || 'The crew';
    st.history.push({ sol: st.sol, event: eventId, choice: choiceId });
    return { event: e, choice: c, result: result.split('{field_name}').join(names) };
  }

  // Check the plan against the sol's real conditions. Returns crisis events to answer (possibly none).
  function startSol(plan) {
    if (st.pending.length) throw new Error('answer pending events first');
    const s = st.sol, env = world.env.sols[s];
    st.plan = normalizePlan(plan);
    st.crisisCtx = { fieldIds: [] };
    if (env.kind === 'severe') {
      const p = st.plan, fieldIds = world.crew.crew.map(c => c.id).filter(id => taskOf(id) === 'field' && p.levels.rover >= B.expedition.needs_rover_level && p.posture !== 'shelter');
      st.crisisCtx.fieldIds = fieldIds;
      for (const c of ev.crisis) {
        if (c.trigger === 'severe_storm_with_field_crew' && fieldIds.length) st.pending.push(c);
        if (c.trigger === 'severe_storm_power_short' && projectedBattery() < B.shield.storm_mode_kwh) st.pending.push(c);
      }
    }
    const names = st.crisisCtx.fieldIds.map(crewName).join(' and ') || 'The crew';
    return st.pending.map(e => Object.assign({}, e, { text: e.text.split('{field_name}').join(names),
      choices: e.choices.map(c => Object.assign({}, c, { hint: (c.hint || '').split('{field_name}').join(names) })) }));
  }

  function normalizePlan(plan) {
    const L = B.power.levels, levels = {};
    for (const sys in L) levels[sys] = clamp(Math.round((plan.levels && plan.levels[sys]) || 0), 0, L[sys].length - 1);
    const posture = B.radiation.posture[plan.posture] ? plan.posture : 'normal';
    const tasks = {};
    for (const c of world.crew.crew) tasks[c.id] = (plan.tasks && plan.tasks[c.id]) || 'rest';
    return { levels, posture, tasks };
  }
  function taskOf(id) { if (st.crew[id].standdown) return 'rest'; return st.lockTask[id] || st.plan.tasks[id]; }
  function solarToday() {
    let g = B.power.solar_clear_kwh_per_sol * diff.solar_mult;
    for (const m of st.solarMods) g *= m.mult;
    return g;
  }
  function demand(levels) { let d = 0; for (const sys in levels) d += B.power.levels[sys][levels[sys]]; return d; }
  function projectedBattery() { return clamp(st.battery + solarToday() - demand(st.plan.levels), 0, B.power.battery_capacity_kwh); }

  // Play the sol out. Returns a report of everything that changed (for the UI and the debrief).
  function finishSol() {
    if (st.pending.length) throw new Error('answer crisis events first');
    const s = st.sol, env = world.env.sols[s], p = st.plan, rep = { sol: s, env, notes: [], harvest: [], standdowns: [], brownout: [] };
    const levels = Object.assign({}, p.levels);
    const so = st.stormOverride;
    if (so && so.gh_force_level !== undefined) { st.gh.forceLevel = so.gh_force_level; st.gh.forceSols = so.gh_force_sols || 1; }
    if (st.gh.forceSols > 0) { levels.greenhouse = Math.min(levels.greenhouse, st.gh.forceLevel); st.gh.forceSols -= 1; }

    // --- power ---
    const gen = solarToday();
    let avail = st.battery + gen, need = demand(levels);
    for (const sys of B.power.brownout_order) {
      while (need > avail && levels[sys] > 0) { levels[sys] -= 1; need = demand(levels); if (rep.brownout.indexOf(sys) < 0) rep.brownout.push(sys); }
    }
    if (need > avail) need = avail;
    st.battery = clamp(avail - need, 0, B.power.battery_capacity_kwh);
    rep.generated = gen; rep.used = need; rep.levels = levels;
    if (rep.brownout.length) { st.closeCalls += 1; st.morale = clamp(st.morale - 5, 0, 100); }
    if (rep.brownout.indexOf('life_support') >= 0 && !st.flags.freezer_lost) {
      st.flags.freezer_lost = true; st.food = Math.max(0, st.food - B.power.freezer_loss_food_crew_sols);
      rep.notes.push('freezer_lost');
    }

    // --- shelter use and storm mode ---
    const stormy = env.kind === 'storm' || env.kind === 'severe';
    let readiness = 0;
    if (env.kind === 'severe') {
      st.sawSevere = true;
      if (so && so.readiness !== undefined) readiness = so.readiness;
      else if (st.battery >= B.shield.storm_mode_kwh) { st.battery -= B.shield.storm_mode_kwh; readiness = B.shield.readiness_funded; rep.notes.push('storm_mode'); }
      else readiness = B.shield.readiness_unfunded;
    } else if (p.posture !== 'normal' || env.kind === 'storm') {
      // running the shelter for a day costs power whether or not anything arrives
      if (p.posture !== 'normal') {
        if (st.battery >= B.shield.shelter_sol_kwh) { st.battery -= B.shield.shelter_sol_kwh; readiness = B.shield.readiness_funded; }
        else readiness = B.shield.readiness_unfunded;
      } else readiness = B.shield.readiness_unfunded;
    }
    const shelterMult = 1 - B.shield.max_block * st.cover * readiness;
    rep.readiness = readiness; rep.shelterMult = shelterMult;

    // --- crew work ---
    const post = B.radiation.posture[p.posture];
    const postEff = post.task_efficiency === undefined ? 1 : post.task_efficiency;
    const eff = {}, task = {};
    for (const c of world.crew.crew) {
      const id = c.id; task[id] = taskOf(id);
      const t = world.crew.tasks.find(x => x.id === task[id]);
      let e = (st.crew[id].fatigue >= B.crew.tired_at ? B.crew.tired_efficiency : 1) * postEff * st.workMultToday;
      if (t && t.best === id) e *= 1.25;
      if (task[id] === 'rest') e = 0;
      eff[id] = e;
    }
    const sum = (name) => world.crew.crew.reduce((a, c) => a + (task[c.id] === name ? eff[c.id] : 0), 0);
    const tend = sum('greenhouse') + (so && so.tender ? 1 : 0);
    const digging = sum('dig'), repairing = sum('repair');
    const fo = st.fieldOverride;
    const roverOk = levels.rover >= B.expedition.needs_rover_level;
    const fieldIds = world.crew.crew.map(c => c.id).filter(id => task[id] === 'field' && roverOk && eff[id] > 0);
    rep.tasks = task; rep.fieldIds = fieldIds;

    // --- greenhouse ---
    const G = B.greenhouse, gl = levels.greenhouse;
    if (st.gh.alive) {
      const watered = st.water > B.water.low_kg || gl === 0;
      st.gh.growth = clamp(st.gh.growth + (gl > 0 && watered ? G.growth_per_sol_by_level[gl] + G.tended_growth_bonus * Math.min(1.25, tend) : 0), 0, 100);
      let dh = tend > 0 ? G.tended_health * Math.min(1, tend) : G.untended_health;
      dh += gl === 0 ? G.dark_health : gl === 1 ? G.dim_health : 0;
      if (!watered) dh += G.dry_health;
      st.gh.health = clamp(st.gh.health + dh, 0, 100);
      if (gl === 0 && st.flags.promised_light && !st.flags.promise_broken) { st.flags.promise_broken = true; st.trust = clamp(st.trust - 8, 0, 100); st.morale = clamp(st.morale - 5, 0, 100); rep.notes.push('promise_broken'); }
      if (st.gh.health < G.dead_below) { st.gh.alive = false; rep.notes.push('greenhouse_died'); }
      while (st.gh.alive && st.gh.harvested < G.harvests.length && st.gh.growth >= G.harvests[st.gh.harvested].at_growth) {
        const h = G.harvests[st.gh.harvested]; st.gh.harvested += 1;
        const f = h.food_crew_sols * st.gh.health / 100; st.food += f; st.gh.harvestFood += f; rep.harvest.push({ crop: h.crop, food: f });
      }
      if (st.gh.alive && st.gh.microgreensSol && s === st.gh.microgreensSol + 6) { st.food += 3; st.gh.harvestFood += 3; rep.harvest.push({ crop: 'microgreens', food: 3 }); }
    }

    // --- air ---
    const made = B.air.o2_made_kg_by_level[levels.life_support] * (st.faults.scrubber ? 0.75 : 1)
               + (st.gh.alive && gl > 0 ? B.air.plants_o2_kg_per_sol * st.gh.health / 100 : 0);
    const used = B.mission.crew_size * B.air.o2_use_per_crew_sol_kg;
    st.o2 = clamp(st.o2 + made - used, 0, B.air.o2_capacity_kg);
    const o2Frac = st.o2 / B.air.o2_capacity_kg;
    if (o2Frac < st.minO2Frac) st.minO2Frac = o2Frac;
    if (o2Frac < B.air.low_fraction) { st.closeCalls += 1; st.morale = clamp(st.morale - 4, 0, 100); rep.notes.push('air_low'); }
    rep.o2Made = made; rep.o2Used = used;

    // --- water ---
    const wUse = B.mission.crew_size * B.water.use_per_crew_sol_kg;
    let wLoss = wUse * (1 - B.water.recycle_fraction_by_level[levels.life_support])
              + B.water.greenhouse_use_kg_by_level[gl] * (levels.life_support >= 1 ? 0.2 : 1);
    if (st.faults.leak) { wLoss += st.faults.leakRate; st.faults.leakRate += 1; }
    st.water = clamp(st.water - wLoss, 0, B.water.capacity_kg);
    if (st.water < B.water.low_kg) { st.morale = clamp(st.morale - 3, 0, 100); rep.notes.push('water_low'); }
    rep.waterLost = wLoss;

    // --- food ---
    if (st.food >= B.mission.crew_size) st.food -= B.mission.crew_size;
    else { st.food = 0; st.morale = clamp(st.morale + B.food.ration_morale, 0, 100); for (const id in st.crew) st.crew[id].fatigue = clamp(st.crew[id].fatigue + 10, 0, 100); rep.notes.push('rationing'); }

    // --- repairs, digging, expedition ---
    let rp = repairing;
    if (rp > 0 && st.faults.scrubber) { st.faults.scrubber = false; rp -= 1; rep.notes.push('fixed_scrubber'); }
    if (rp > 0 && st.faults.leak) { st.faults.leak = false; st.faults.leakRate = 0; rp -= 1; rep.notes.push('fixed_leak'); }
    if (rp > 0) st.battery = clamp(st.battery + 3 * rp, 0, B.power.battery_capacity_kwh);      // tuned-up machines waste less
    if (digging > 0) st.cover = clamp(st.cover + digging * (roverOk && fieldIds.length === 0 ? B.shield.cover_per_dig_with_rover : B.shield.cover_per_dig), 0, 1);
    const X = st.expedition;
    if (fieldIds.length && X.step < B.expedition.steps.length) {
      const aborted = fo && fo.abort_step;
      if (!aborted) {
        X.progress += fieldIds.reduce((a, id) => a + eff[id], 0);
        if (X.progress >= 1 || (fo && fo.complete_step)) { X.progress = 0; X.step += 1; st.science += B.expedition.science_per_step; rep.notes.push('expedition_step_' + X.step); }
        if (X.step >= B.expedition.steps.length) { X.sample = 'secured'; rep.notes.push('sample_secured'); }
      } else rep.notes.push('expedition_aborted');
    }

    // --- radiation ---
    const R = B.radiation, base = Math.min(env.dose, world.env.baselineSol), storm = Math.max(0, env.dose - world.env.baselineSol);
    let f0 = stormy ? post.sheltered_fraction_on_storm : (p.posture === 'shelter' ? 1 : 0);
    if (stormy && st.flags.drilled) f0 = Math.min(1, f0 + R.drilled_bonus);
    rep.dose = {};
    for (const id in st.crew) {
      const m = st.crew[id], t = id === 'commander' ? 'command' : task[id];
      const isField = fieldIds.indexOf(id) >= 0;
      let where = isField ? R.exposure.field : t === 'dig' ? R.exposure.outside_work : R.exposure.habitat;
      let f = f0;
      if (isField) { f = stormy ? R.field_sheltered_fraction : 0; if (fo) { if (fo.sheltered_fraction !== undefined) f = fo.sheltered_fraction; if (fo.exposure) { where = R.exposure[fo.exposure]; f = 0; } } }
      if (st.crewStorm[id]) { where = R.exposure[st.crewStorm[id]]; f = 0; }
      const baseDose = p.posture === 'shelter' && !isField ? base * shelterMult : base * where;
      const stormDose = storm * (f * shelterMult + (1 - f) * where);
      m.dose += baseDose + stormDose; rep.dose[id] = baseDose + stormDose;
      if (env.kind === 'severe' && f < st.stormProtectedMin) st.stormProtectedMin = f;
      if (!m.standdown && m.dose > st.doseBudget) { m.standdown = true; rep.standdowns.push(id); st.morale = clamp(st.morale - 6, 0, 100); }
    }

    // --- fatigue, morale, messages ---
    for (const c of world.crew.crew) {
      const m = st.crew[c.id], t = task[c.id];
      const d = p.posture === 'shelter' ? -10 : t === 'rest' ? B.crew.fatigue_rest : t === 'field' ? B.crew.fatigue_field : t === 'dig' ? B.crew.fatigue_work + 7 : B.crew.fatigue_work;
      m.fatigue = clamp(m.fatigue + d, 0, 100);
    }
    if (st.gh.alive && tend > 0) st.morale = clamp(st.morale + 1, 0, 100);
    if (B.comms.fragment_sols.indexOf(s) >= 0) {
      if (levels.comms >= 1 && st.fragmentsMissed === 0) { st.fragments += 1; rep.notes.push('fragment_' + st.fragments); }
      else { st.fragmentsMissed += 1; rep.notes.push('fragment_missed'); }
    }
    st.commsYesterday = levels.comms >= 1;
    for (const m of st.solarMods) m.sols -= 1;
    st.solarMods = st.solarMods.filter(m => m.sols > 0);

    // --- limits ---
    const standdowns = Object.keys(st.crew).filter(id => st.crew[id].standdown).length;
    if (st.o2 <= 0) { st.evacuated = true; st.evacReason = 'air'; }
    else if (st.water <= 0) { st.evacuated = true; st.evacReason = 'water'; }
    else if (standdowns >= B.fail.standdown_count_for_evacuation) { st.evacuated = true; st.evacReason = 'health'; }
    if (st.evacuated || s >= B.mission.sols) st.over = true;
    rep.state = snapshot();
    return rep;
  }

  function maxDoseFraction() { let m = 0; for (const id in st.crew) m = Math.max(m, st.crew[id].dose / st.doseBudget); return m; }
  function summary() {
    const G = B.greenhouse, standdowns = Object.keys(st.crew).filter(id => st.crew[id].standdown).length;
    const danger = standdowns >= 1 || st.closeCalls >= 2 || st.risk >= 3 || maxDoseFraction() >= B.radiation.danger_fraction;
    return {
      evacuated: st.evacuated, evacReason: st.evacReason, sample: st.expedition.sample, standdowns,
      greenhouse_alive: st.gh.alive, greenhouse_thriving: st.gh.alive && st.gh.health >= G.thriving_health && st.gh.growth >= G.thriving_growth,
      fragments: st.fragments, storm_protected: !st.sawSevere || st.stormProtectedMin >= 0.8, risk: st.risk, danger,
      closeCalls: st.closeCalls, maxDoseFraction: maxDoseFraction(), minO2Frac: st.minO2Frac, science: st.science,
      morale: st.morale, trust: st.trust, harvestFood: st.gh.harvestFood, cover: st.cover, sols: st.sol,
    };
  }
  function ending() {
    const u = summary();
    for (const e of world.endings.endings) {
      const w = e.when; let ok = true;
      if (w.evacuated !== undefined && w.evacuated !== u.evacuated) ok = false;
      if (w.sample !== undefined && w.sample !== u.sample) ok = false;
      if (w.sample_not !== undefined && w.sample_not === u.sample) ok = false;
      if (w.standdowns !== undefined && w.standdowns !== u.standdowns) ok = false;
      if (w.greenhouse_alive !== undefined && w.greenhouse_alive !== u.greenhouse_alive) ok = false;
      if (w.greenhouse_thriving !== undefined && w.greenhouse_thriving !== u.greenhouse_thriving) ok = false;
      if (w.fragments_min !== undefined && u.fragments < w.fragments_min) ok = false;
      if (w.storm_protected !== undefined && w.storm_protected !== u.storm_protected) ok = false;
      if (w.risk_max !== undefined && u.risk > w.risk_max) ok = false;
      if (w.danger !== undefined && w.danger !== u.danger) ok = false;
      if (ok) return { ending: e, summary: u };
    }
    return null;
  }
  function snapshot() {
    const r = (v) => Math.round(v * 1000) / 1000;
    const crew = {}; for (const id in st.crew) crew[id] = { dose: r(st.crew[id].dose), fatigue: r(st.crew[id].fatigue), standdown: st.crew[id].standdown };
    return { sol: st.sol, battery: r(st.battery), o2: r(st.o2), water: r(st.water), food: r(st.food), gh_health: r(st.gh.health), gh_growth: r(st.gh.growth),
             gh_alive: st.gh.alive, cover: r(st.cover), morale: r(st.morale), trust: r(st.trust), science: st.science, risk: st.risk,
             step: st.expedition.step, sample: st.expedition.sample, fragments: st.fragments, over: st.over, evacuated: st.evacuated, crew };
  }

  return { state: st, world, beginSol, choose, startSol, finishSol, summary, ending, snapshot, solarToday, demand,
           projectedBattery: () => projectedBattery(), doseBudget: st.doseBudget };
}

module.exports = { makeRng, parseUtc, buildEnvironment, morningReport, createMission };
