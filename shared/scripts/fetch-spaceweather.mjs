#!/usr/bin/env node
// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
/**
 * fetch-spaceweather.mjs — archives a REAL window of NASA space weather for the game.
 *
 *   DONKI  (NASA CCMC)  flares, CMEs, particle events, geomagnetic storms, WSA-ENLIL arrival predictions
 *   RadLab (NASA OSDR)  dose rate measured on the surface of Mars by Curiosity's RAD ("MSL-RAD-Surface")
 *
 * Usage (run from the repo root):
 *   node shared/scripts/fetch-spaceweather.mjs --id may-2024 --start 2024-05-06 --end 2024-05-27 --sol1 2024-05-13 --label "…" --blurb "…"
 *   node shared/scripts/fetch-spaceweather.mjs --recent 30          # last 30 days → id "recent"
 *   node shared/scripts/fetch-spaceweather.mjs --index              # rebuild index.json and SOURCES.md only
 *
 * Output: shared/data/spaceweather/<id>.json  (+ index.json, ../SOURCES.md)
 * Nothing is invented: records are trimmed to the fields the game uses and summarised per UTC day.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DONKI_TYPES, DONKI_SOURCES, RADLAB_INSTRUMENT, radlabUrl, trimDonki, parseRadCsv, radDaily,
  buildDays, deriveGame, pickWindow, flareFlux, addDays, isoDate, threat,
} from './lib/spaceweather.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'data', 'spaceweather');
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
    return acc;
  }, []),
);

async function get(url, as = 'json', tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(90000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const text = await r.text();
      return as === 'json' ? (text.trim() ? JSON.parse(text) : []) : text;
    } catch (e) {
      lastErr = e;
      await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
    }
  }
  throw lastErr;
}

async function fetchDonki(type, start, end) {
  for (const src of DONKI_SOURCES) {
    const url = src.url(type, start, end, process.env.NASA_API_KEY || 'DEMO_KEY');
    try {
      const data = await get(url);
      return { data, source: src.name, url: url.replace(/api_key=[^&]+/, 'api_key=DEMO_KEY') };
    } catch (e) {
      console.warn(`  ${type} via ${src.name} failed: ${e.message}`);
    }
  }
  throw new Error(`All DONKI sources failed for ${type}`);
}

async function archive({ id, start, end, sol1, label, blurb }) {
  console.log(`Archiving ${id}: ${start} → ${end}`);
  const donki = {};
  const sources = [];
  for (const type of DONKI_TYPES) {
    // WSA-ENLIL runs are listed by completion time; start a few days early so earlier forecasts are included.
    const s = type === 'WSAEnlilSimulations' ? addDays(start, -4) : start;
    const { data, source, url } = await fetchDonki(type, s, end);
    donki[type] = trimDonki(type, data);
    sources.push({ dataset: `DONKI ${type}`, provider: source, url, records: donki[type].length });
    console.log(`  ${type}: ${donki[type].length} records`);
  }
  let rad = null;
  const rurl = radlabUrl(start, addDays(end, 1));
  try {
    const rows = parseRadCsv(await get(rurl, 'text'));
    rad = radDaily(rows);
    sources.push({ dataset: `RadLab ${RADLAB_INSTRUMENT} absorbed dose rate (µGy/h)`, provider: 'NASA OSDR RadLab', url: rurl, records: rows.length });
    console.log(`  RadLab: ${rows.length} samples, ${rad.size} days with ≥12 h coverage`);
  } catch (e) {
    console.warn(`  RadLab failed: ${e.message}`);
  }
  const built = buildDays({ start, end, donki, rad: rad && rad.size ? rad : null });
  const { calmDose, days } = deriveGame(built);
  const measured = days.some((d) => d.rad);
  if (!sol1) sol1 = days[pickWindow(days)].date;

  const notable = {
    flares: [...donki.FLR].sort((a, b) => flareFlux(b.cls) - flareFlux(a.cls)).slice(0, 10),
    cmes: [...donki.CME].filter((c) => c.speed != null).sort((a, b) => b.speed - a.speed).slice(0, 8),
    sep: donki.SEP,
  };
  const peak = days.reduce((m, d) => (threat(d) > threat(m) ? d : m), days[0]);
  const file = {
    meta: {
      id, label, blurb, start, end, sol1,
      mode: 'archived',
      retrievedUtc: new Date().toISOString().slice(0, 19) + 'Z',
      radSource: measured ? 'measured' : 'estimated',
      peakDate: peak.date,
      note: 'Real NASA records, trimmed to the fields the game uses and summarised per UTC day. One game sol = one real day. See shared/science-log.md.',
      sources,
    },
    calmDose,
    days,
    notable,
  };
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `${id}.json`), JSON.stringify(file, null, 1));
  console.log(`  → ${id}.json  calm dose ${calmDose} µGy/day · peak ${peak.date} storm level ${peak.game.stormLevel} (${peak.game.radSource})`);
  for (const d of days) {
    console.log(
      `   ${d.date}  flare ${String(d.flares.max ?? '-').padEnd(5)} cme ${String(d.cmes.fastest ?? '-').padStart(4)}  marsArr ${d.marsArrivals.length} fc ${d.marsForecasts.length}  kp ${d.earth.kpMax ?? '-'}  sep ${d.sep.length}  dose ${String(d.game.doseOutside).padStart(7)} storm L${d.game.stormLevel} flare L${d.game.flareLevel} radio ${d.game.radioNoise}  delay ${d.orbit.lightMinutes} min`,
    );
  }
}

function index() {
  const files = fs.readdirSync(OUT).filter((f) => f.endsWith('.json') && f !== 'index.json').sort();
  const list = files.map((f) => {
    const j = JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8'));
    const m = j.meta;
    const peak = j.days.find((d) => d.date === m.peakDate);
    return {
      id: m.id, label: m.label, blurb: m.blurb, start: m.start, end: m.end, sol1: m.sol1,
      retrievedUtc: m.retrievedUtc, radSource: m.radSource, peakDate: m.peakDate,
      peakStormLevel: peak?.game.stormLevel ?? 0, file: `spaceweather/${f}`,
    };
  });
  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify({ windows: list }, null, 1));

  let md = '# Archived real NASA data — sources\n\n';
  md += '> Generated by `shared/scripts/fetch-spaceweather.mjs --index`. Do not edit by hand.\n';
  md += '> These files are **archived snapshots of real records**. The game labels them "ARCHIVED" and never presents them as live.\n\n';
  for (const f of files) {
    const m = JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8')).meta;
    md += `## \`spaceweather/${f}\` — ${m.label}\n\n`;
    md += `- Date range: **${m.start} → ${m.end}** (UTC) · mission sol 1 = ${m.sol1}\n- Retrieved: ${m.retrievedUtc}\n- Mars-surface dose: **${m.radSource}**\n\n`;
    md += '| Dataset | Provider | Records | Request URL |\n|---|---|---|---|\n';
    for (const s of m.sources) md += `| ${s.dataset} | ${s.provider} | ${s.records} | ${s.url} |\n`;
    md += '\n';
  }
  md += '## Fields kept\n\n';
  md += '- **FLR**: flrID, beginTime, peakTime, endTime, classType, sourceLocation, activeRegionNum, link\n';
  md += '- **CME**: activityID, startTime, sourceLocation, activeRegionNum, link + most accurate analysis: speed, type, halfAngle, latitude, longitude\n';
  md += '- **SEP**: sepID, eventTime, instruments, link · **GST**: gstID, startTime, allKpIndex, link · **IPS**: activityID, eventTime, location, link\n';
  md += '- **WSAEnlilSimulations**: simulationID, modelCompletionTime, estimatedShockArrivalTime, isEarthGB, impactList (location, arrivalTime, isGlancingBlow), cmeInputs (cmeStartTime, speed, halfAngle, longitude), link\n';
  md += '- **RadLab**: timestamp, absorbed_dose_rate (µGy/h) for instrument_id `MSL-RAD-Surface` → per-day time-weighted dose, mean and peak rate, and a thinned curve\n';
  fs.writeFileSync(path.join(ROOT, 'data', 'SOURCES.md'), md);
  console.log(`index.json + SOURCES.md written (${files.length} windows)`);
}

if (args.recent) {
  const n = Number(args.recent) || 30;
  const end = isoDate(Date.now());
  await archive({
    id: 'recent', start: addDays(end, -n), end,
    label: `The ${n} days before ${end}`,
    blurb: 'A snapshot of the real Sun taken when this build was made. Used when live data cannot be reached.',
  });
} else if (args.id) {
  await archive({ id: args.id, start: args.start, end: args.end, sol1: args.sol1 === true ? undefined : args.sol1, label: args.label, blurb: args.blurb });
}
index();
