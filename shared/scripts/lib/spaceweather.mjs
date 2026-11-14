// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
/**
 * spaceweather.mjs — pure functions shared by the archive script (Node) and the web game (browser).
 *
 * Turns raw NASA DONKI records + NASA RadLab dose rows into ONE SUMMARY PER REAL UTC DAY,
 * then derives the few game-facing values (storm level, dose) with documented, deterministic rules.
 * No network or file access in this file, so it can be unit-tested and ported 1:1 to C#.
 *
 * Sources:
 *   DONKI   — NASA CCMC Space Weather Database Of Notifications, Knowledge, Information
 *   RadLab  — NASA OSDR radiation dosimetry portal, instrument "MSL-RAD-Surface" (Curiosity rover, Mars surface)
 *   Orbits  — JPL "Approximate Positions of the Planets" (Keplerian elements, valid 1800–2050)
 */

export const DONKI_TYPES = ['FLR', 'CME', 'SEP', 'GST', 'IPS', 'WSAEnlilSimulations'];

/** Endpoints, tried in order. The CCMC endpoint needs no key and allows browser (CORS) requests. */
export const DONKI_SOURCES = [
  {
    id: 'ccmc',
    name: 'NASA CCMC DONKI',
    url: (type, start, end) => `https://ccmc.gsfc.nasa.gov/DONKI-API/get/${type}?startDate=${start}&endDate=${end}`,
  },
  {
    id: 'apinasa',
    name: 'NASA Open APIs (api.nasa.gov)',
    url: (type, start, end, key = 'DEMO_KEY') =>
      `https://api.nasa.gov/DONKI/${type}?startDate=${start}&endDate=${end}&api_key=${key}`,
  },
];

export const RADLAB_INSTRUMENT = 'MSL-RAD-Surface';
export const radlabUrl = (start, endExclusive) =>
  `https://visualization.osdr.nasa.gov/radlab/api/?instrument_id=${RADLAB_INSTRUMENT}` +
  `&timestamp%3E=${start}T00:00&timestamp%3C${endExclusive}T00:00&absorbed_dose_rate&format=csv`;

// ---------------------------------------------------------------- dates

const DAY_MS = 86400000;
export const isoDate = (ms) => new Date(ms).toISOString().slice(0, 10);
export const dateMs = (iso) => Date.parse(iso.length <= 10 ? iso + 'T00:00:00Z' : iso);
export function addDays(iso, n) {
  return isoDate(dateMs(iso) + n * DAY_MS);
}
export function dateRange(start, end) {
  const out = [];
  for (let t = dateMs(start); t <= dateMs(end); t += DAY_MS) out.push(isoDate(t));
  return out;
}
/** DONKI times look like "2024-05-10T06:54Z" — the first 10 characters are the UTC day. */
const dayOf = (s) => (s ? s.slice(0, 10) : null);

// ---------------------------------------------------------------- DONKI trimming

/** Keep only the fields the game uses. Records are otherwise unmodified. */
export function trimDonki(type, list) {
  if (!Array.isArray(list)) return [];
  switch (type) {
    case 'FLR':
      return list.map((f) => ({
        id: f.flrID,
        begin: f.beginTime,
        peak: f.peakTime,
        end: f.endTime ?? null,
        cls: f.classType,
        loc: f.sourceLocation || null,
        region: f.activeRegionNum ?? null,
        link: f.link,
      }));
    case 'CME':
      return list.map((c) => {
        const all = c.cmeAnalyses || [];
        const a = all.find((x) => x.isMostAccurate) || all[0] || null;
        return {
          id: c.activityID,
          start: c.startTime,
          loc: c.sourceLocation || null,
          region: c.activeRegionNum ?? null,
          speed: a?.speed ?? null,
          type: a?.type ?? null,
          halfAngle: a?.halfAngle ?? null,
          lat: a?.latitude ?? null,
          lon: a?.longitude ?? null,
          link: c.link,
        };
      });
    case 'SEP':
      return list.map((s) => ({
        id: s.sepID,
        time: s.eventTime,
        instruments: (s.instruments || []).map((i) => i.displayName),
        link: s.link,
      }));
    case 'GST':
      return list.map((g) => ({
        id: g.gstID,
        start: g.startTime,
        kp: (g.allKpIndex || []).map((k) => ({ t: k.observedTime, kp: k.kpIndex })),
        link: g.link,
      }));
    case 'IPS':
      return list.map((i) => ({ id: i.activityID, time: i.eventTime, location: i.location, link: i.link }));
    case 'WSAEnlilSimulations':
      return list.map((s) => ({
        id: s.simulationID,
        done: s.modelCompletionTime,
        earthShock: s.estimatedShockArrivalTime || null,
        earthGlancing: !!s.isEarthGB,
        impacts: (s.impactList || []).map((i) => ({
          location: i.location,
          arrival: i.arrivalTime,
          glancing: !!i.isGlancingBlow,
        })),
        cmes: (s.cmeInputs || []).map((c) => ({
          start: c.cmeStartTime,
          speed: c.speed ?? null,
          halfAngle: c.halfAngle ?? null,
          lon: c.longitude ?? null,
        })),
        link: s.link,
      }));
    default:
      return [];
  }
}

/** Flare class "X5.8" → peak X-ray flux in W/m² (A=1e-8 … X=1e-4). Used only for ranking. */
export function flareFlux(cls) {
  if (!cls) return 0;
  const m = /^([ABCMX])\s*([\d.]+)?/i.exec(cls.trim());
  if (!m) return 0;
  const base = { A: 1e-8, B: 1e-7, C: 1e-6, M: 1e-5, X: 1e-4 }[m[1].toUpperCase()];
  return base * (m[2] ? parseFloat(m[2]) : 1);
}

// ---------------------------------------------------------------- RadLab

/** RadLab CSV → sorted [{ t: epoch ms, v: µGy/h }]. */
export function parseRadCsv(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/).slice(1)) {
    if (!line) continue;
    const p = line.split(',');
    const t = Date.parse(p[0].replace(/"/g, '') + 'Z');
    const v = parseFloat(p[2]);
    if (Number.isFinite(t) && Number.isFinite(v)) rows.push({ t, v });
  }
  rows.sort((a, b) => a.t - b.t);
  return rows;
}

/**
 * Time-weighted daily dose from an irregularly sampled dose-rate series.
 * Linear interpolation between samples (gaps longer than 6 h are not bridged),
 * split at UTC midnight. A day needs ≥ 12 h of coverage; its dose is scaled to 24 h.
 * Returns Map(date → { dose µGy, meanRate, maxRate, maxTime, samples, hours, profile })
 * profile = [[minuteOfDay, rate], …] thinned to ≤ 96 points (for replaying the real curve).
 */
export function radDaily(rows) {
  const days = new Map();
  const get = (d) => {
    let o = days.get(d);
    if (!o) {
      o = { area: 0, hours: 0, maxRate: -1, maxTime: null, samples: 0, pts: [] };
      days.set(d, o);
    }
    return o;
  };
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const o = get(isoDate(r.t));
    o.samples++;
    o.pts.push([Math.round((r.t % DAY_MS) / 60000), r.v]);
    if (r.v > o.maxRate) {
      o.maxRate = r.v;
      o.maxTime = new Date(r.t).toISOString().slice(0, 16) + 'Z';
    }
    if (i === 0) continue;
    const p = rows[i - 1];
    const span = r.t - p.t;
    if (span <= 0 || span > 6 * 3600000) continue;
    const slope = (r.v - p.v) / span;
    let t0 = p.t;
    while (t0 < r.t) {
      const dayEnd = (Math.floor(t0 / DAY_MS) + 1) * DAY_MS;
      const t1 = Math.min(r.t, dayEnd);
      const v0 = p.v + slope * (t0 - p.t);
      const v1 = p.v + slope * (t1 - p.t);
      const h = (t1 - t0) / 3600000;
      const d = get(isoDate(t0));
      d.area += ((v0 + v1) / 2) * h;
      d.hours += h;
      t0 = t1;
    }
  }
  const out = new Map();
  for (const [d, o] of days) {
    if (o.hours < 12) continue;
    const meanRate = o.area / o.hours;
    const step = Math.max(1, Math.ceil(o.pts.length / 96));
    const profile = [];
    // thin the curve but always keep the peak sample
    let peakIdx = 0;
    o.pts.forEach((p, i) => {
      if (p[1] > o.pts[peakIdx][1]) peakIdx = i;
    });
    o.pts.forEach((p, i) => {
      if (i % step === 0 || i === peakIdx) profile.push([p[0], round(p[1], 2)]);
    });
    out.set(d, {
      source: 'measured',
      dose: round(meanRate * 24, 1),
      meanRate: round(meanRate, 3),
      maxRate: round(o.maxRate, 2),
      maxTime: o.maxTime,
      samples: o.samples,
      hours: round(o.hours, 1),
      profile,
    });
  }
  return out;
}

const round = (x, n) => {
  const k = 10 ** n;
  return Math.round(x * k) / k;
};
const median = (a) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// ---------------------------------------------------------------- orbits (JPL approximate positions)

const EL = {
  // [value at J2000, change per Julian century] — JPL SSD "Approximate Positions of the Planets", Table 1
  earth: { a: [1.00000261, 0.00000562], e: [0.01671123, -0.00004392], I: [-0.00001531, -0.01294668], L: [100.46457166, 35999.37244981], wbar: [102.93768193, 0.32327364], Om: [0.0, 0.0] },
  mars: { a: [1.52371034, 0.00001847], e: [0.0933941, 0.00007882], I: [1.84969142, -0.00813131], L: [-4.55343205, 19140.30268499], wbar: [-23.94362959, 0.44441088], Om: [49.55953891, -0.29257343] },
};
const RAD = Math.PI / 180;
export const AU_KM = 149597870.7;
export const LIGHT_SECONDS_PER_AU = 499.004784;

/** Heliocentric J2000 ecliptic position in AU. `body` = 'earth' (Earth–Moon barycentre) or 'mars'. */
export function helioPosition(body, ms) {
  const T = (ms / DAY_MS + 2440587.5 - 2451545.0) / 36525;
  const el = EL[body];
  const a = el.a[0] + el.a[1] * T;
  const e = el.e[0] + el.e[1] * T;
  const I = (el.I[0] + el.I[1] * T) * RAD;
  const L = el.L[0] + el.L[1] * T;
  const wbar = el.wbar[0] + el.wbar[1] * T;
  const Om = el.Om[0] + el.Om[1] * T;
  const w = (wbar - Om) * RAD;
  const O = Om * RAD;
  let M = (L - wbar) % 360;
  if (M > 180) M -= 360;
  if (M < -180) M += 360;
  M *= RAD;
  let E = M + e * Math.sin(M);
  for (let i = 0; i < 30; i++) {
    const dE = (M - (E - e * Math.sin(E))) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < 1e-12) break;
  }
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(O), sO = Math.sin(O), cI = Math.cos(I), sI = Math.sin(I);
  return {
    x: (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
    y: (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
    z: sw * sI * xp + cw * sI * yp,
  };
}

/** Earth–Mars geometry for a date: distance, one-way radio delay, and positions for the mini solar-system map. */
export function earthMars(ms) {
  const e = helioPosition('earth', ms);
  const m = helioPosition('mars', ms);
  const d = Math.hypot(m.x - e.x, m.y - e.y, m.z - e.z);
  const lonE = Math.atan2(e.y, e.x) / RAD;
  const lonM = Math.atan2(m.y, m.x) / RAD;
  let sep = lonM - lonE; // Mars' heliocentric longitude relative to Earth's (deg, −180..180)
  sep = ((sep + 540) % 360) - 180;
  return {
    distanceAu: round(d, 4),
    distanceMillionKm: round((d * AU_KM) / 1e6, 1),
    lightSeconds: Math.round(d * LIGHT_SECONDS_PER_AU),
    lightMinutes: round((d * LIGHT_SECONDS_PER_AU) / 60, 2),
    sunLightMinutesMars: round((Math.hypot(m.x, m.y, m.z) * LIGHT_SECONDS_PER_AU) / 60, 2),
    marsAheadOfEarthDeg: round(sep, 1),
    earth: { x: round(e.x, 4), y: round(e.y, 4) },
    mars: { x: round(m.x, 4), y: round(m.y, 4) },
  };
}

// ---------------------------------------------------------------- day summaries

/**
 * @param {object} p
 * @param {string} p.start  first day (YYYY-MM-DD, UTC)
 * @param {string} p.end    last day
 * @param {object} p.donki  { FLR, CME, SEP, GST, IPS, WSAEnlilSimulations } already trimmed
 * @param {Map}    [p.rad]  output of radDaily()
 */
export function buildDays({ start, end, donki, rad }) {
  const days = dateRange(start, end).map((date) => ({
    date,
    flares: { count: 0, C: 0, M: 0, X: 0, max: null, maxPeakTime: null, maxRegion: null, maxLink: null },
    cmes: { count: 0, fastest: null, fastestType: null, fastestLink: null, fastestLongitude: null, fastestHalfAngle: null, fastestStart: null },
    marsArrivals: [],
    marsForecasts: [],
    earth: { kpMax: null, gst: false, shockArrivals: [] },
    sep: [],
    rad: null,
    orbit: earthMars(dateMs(date) + DAY_MS / 2),
  }));
  const byDate = new Map(days.map((d) => [d.date, d]));

  for (const f of donki.FLR || []) {
    const d = byDate.get(dayOf(f.peak || f.begin));
    if (!d) continue;
    d.flares.count++;
    const letter = (f.cls || '').charAt(0).toUpperCase();
    if (letter === 'C' || letter === 'M' || letter === 'X') d.flares[letter]++;
    if (flareFlux(f.cls) > flareFlux(d.flares.max)) {
      d.flares.max = f.cls;
      d.flares.maxPeakTime = f.peak;
      d.flares.maxRegion = f.region;
      d.flares.maxLink = f.link;
    }
  }
  for (const c of donki.CME || []) {
    const d = byDate.get(dayOf(c.start));
    if (!d) continue;
    d.cmes.count++;
    if (c.speed != null && (d.cmes.fastest == null || c.speed > d.cmes.fastest)) {
      d.cmes.fastest = c.speed;
      d.cmes.fastestType = c.type;
      d.cmes.fastestLink = c.link;
      d.cmes.fastestLongitude = c.lon;
      d.cmes.fastestHalfAngle = c.halfAngle;
      d.cmes.fastestStart = c.start;
    }
  }
  const seenArr = new Set();
  const seenFc = new Set();
  const sims = [...(donki.WSAEnlilSimulations || [])].sort((a, b) => (a.done || '').localeCompare(b.done || ''));
  for (const s of sims) {
    const fastest = (s.cmes || []).reduce((m, c) => (c.speed != null && (m == null || c.speed > m.speed) ? c : m), null);
    for (const imp of s.impacts || []) {
      if (imp.location !== 'Mars' || !imp.arrival) continue;
      const hourKey = imp.arrival.slice(0, 13);
      const entry = { arrival: imp.arrival, glancing: imp.glancing, cmeStart: fastest?.start ?? null, cmeSpeed: fastest?.speed ?? null, link: s.link };
      const dArr = byDate.get(dayOf(imp.arrival));
      if (dArr && !seenArr.has(hourKey)) {
        seenArr.add(hourKey);
        dArr.marsArrivals.push(entry);
      }
      const dFc = byDate.get(dayOf(s.done));
      const fcKey = dayOf(s.done) + '>' + hourKey;
      if (dFc && dayOf(s.done) < dayOf(imp.arrival) && !seenFc.has(fcKey)) {
        seenFc.add(fcKey);
        dFc.marsForecasts.push({ issued: s.done, ...entry });
      }
    }
    if (s.earthShock) {
      const d = byDate.get(dayOf(s.earthShock));
      if (d && !d.earth.shockArrivals.includes(s.earthShock)) d.earth.shockArrivals.push(s.earthShock);
    }
  }
  for (const g of donki.GST || []) {
    for (const k of g.kp || []) {
      const d = byDate.get(dayOf(k.t));
      if (!d) continue;
      d.earth.gst = true;
      if (d.earth.kpMax == null || k.kp > d.earth.kpMax) d.earth.kpMax = k.kp;
    }
  }
  for (const s of donki.SEP || []) {
    const d = byDate.get(dayOf(s.time));
    if (d) d.sep.push({ time: s.time, instruments: s.instruments, link: s.link });
  }
  if (rad) for (const d of days) if (rad.has(d.date)) d.rad = rad.get(d.date);
  return days;
}

// ---------------------------------------------------------------- game-facing values

/**
 * Default rules (mirrored in shared/design/balance.json → spaceWeather; the JSON wins if they differ).
 *
 * stormLevel from MEASURED Mars-surface dose when we have it:  q = day dose ÷ calm dose
 *    q < 1.3 → 0 calm · < 2 → 1 active · < 6 → 2 storm · ≥ 6 → 3 severe
 *
 * When no measurement exists (live data — RadLab's Mars record ends in mid-2024), the level is ESTIMATED:
 *    a CME faster than 2,500 km/s launched that day before 12:00 UTC, or the day before after 12:00 UTC → 2 (storm)
 *    otherwise → 0
 * Calibration (our four measured windows): the three CMEs above 2,500 km/s (10 Sep 2017, 15 Feb 2022, 20 May 2024)
 * were each followed within a day by at least a doubling of dose at Curiosity. Slower CMEs and CME clouds that
 * NASA's WSA-ENLIL model predicted to reach Mars did not raise the measured dose, so they never raise the estimate.
 * Estimated storm dose = calm dose × (1 + estimatedStormExtra); 1.5 is the middle of the three measured cases.
 */
export const DEFAULT_RULES = {
  calmDoseDefault: 115, // µGy per day — median of RadLab MSL-RAD-Surface daily dose, Jan–Jun 2024
  measuredRatio: [1.3, 2, 6],
  sepStormCmeSpeed: 2500,
  estimatedStormExtra: 1.5,
  flareLevels: { M: 1e-5, X: 1e-4, X5: 5e-4 },
  kpRadioNoise: 7,
};

const hourOf = (s) => (s ? parseInt(s.slice(11, 13), 10) : 0);

export function deriveGame(days, rules = DEFAULT_RULES) {
  const measured = days.filter((d) => d.rad).map((d) => d.rad.dose);
  const calm = measured.length >= 5 ? median(measured) : rules.calmDoseDefault;
  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    const prev = days[i - 1];
    const flux = flareFlux(d.flares.max);
    const flareLevel = flux >= rules.flareLevels.X5 ? 3 : flux >= rules.flareLevels.X ? 2 : flux >= rules.flareLevels.M ? 1 : 0;
    const kp = d.earth.kpMax ?? 0;
    const radioNoise = flareLevel >= 3 || kp >= rules.kpRadioNoise ? 2 : flareLevel >= 2 || kp >= 5 ? 1 : 0;
    let g;
    if (d.rad) {
      const q = d.rad.dose / calm;
      const [a, b, c] = rules.measuredRatio;
      const stormLevel = q >= c ? 3 : q >= b ? 2 : q >= a ? 1 : 0;
      const doseStorm = stormLevel > 0 ? Math.max(0, d.rad.dose - calm) : 0;
      g = { radSource: 'measured', doseOutside: round(d.rad.dose, 1), doseCalm: round(d.rad.dose - doseStorm, 1), doseStorm: round(doseStorm, 1), stormLevel };
    } else {
      const fastEarly = (d.cmes.fastest ?? 0) >= rules.sepStormCmeSpeed && hourOf(d.cmes.fastestStart) < 12;
      const fastLate = prev && (prev.cmes.fastest ?? 0) >= rules.sepStormCmeSpeed && hourOf(prev.cmes.fastestStart) >= 12;
      const stormLevel = fastEarly || fastLate ? 2 : 0;
      const doseStorm = stormLevel ? calm * rules.estimatedStormExtra : 0;
      g = { radSource: 'estimated', doseOutside: round(calm + doseStorm, 1), doseCalm: round(calm, 1), doseStorm: round(doseStorm, 1), stormLevel };
    }
    d.game = { ...g, flareLevel, radioNoise };
  }
  return { calmDose: round(calm, 1), days };
}

/** How "busy" a day is — used to choose which 10 days of a longer record become the mission. */
export function threat(d) {
  return d.game.stormLevel * 10 + d.game.flareLevel * 2 + (d.marsArrivals.length ? 1 : 0);
}

/** Pick the start index so the busiest day lands on `peakSol` (1-based) when the record allows it. */
export function pickWindow(days, sols = 10, peakSol = 8) {
  if (days.length <= sols) return 0;
  let best = 0;
  for (let i = 1; i < days.length; i++) if (threat(days[i]) > threat(days[best])) best = i;
  return Math.max(0, Math.min(days.length - sols, best - (peakSol - 1)));
}
