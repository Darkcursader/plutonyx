// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
/**
 * make-voices.mjs — records every fixed dialogue line with ElevenLabs synthetic voices (SI-generated audio).
 * Reads ELEVENLABS_API_KEY from the repo's .env (never committed). Lines with live numbers ({...}) are skipped:
 * the game reads those with the computer's own voice. Each speaker gets one adult voice from ElevenLabs'
 * default library. Output: shared/audio/voices/<key>.pcm (raw 16-bit mono PCM, 24 kHz) + index.json, copied into the Unity StreamingAssets.
 * Already-recorded lines are skipped, so a run that stops at the monthly limit can simply be repeated next month.
 *
 * Usage (repo root): node shared/scripts/make-voices.mjs [--list-voices] [--dry]
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'shared/audio/voices');
const UNITY = path.join(ROOT, 'desktop/Assets/StreamingAssets/voices');
const MODEL = 'eleven_flash_v2_5';
// speaker → preferred default voices (first one available on the account wins). All adult voices.
const CAST = {
  ana: ['Sarah', 'Laura', 'Matilda'],         // botanist, 38, warm and patient
  dil: ['Jessica', 'Laura', 'Charlotte'],     // geologist, 31, quick and curious
  kofi: ['Brian', 'Chris', 'Eric'],           // engineer, 44, calm, dry humour
  sam: ['Bill', 'George', 'Daniel'],          // flight director on Earth, 55, steady and kind
  pip: ['River', 'Alice', 'Lily'],            // wrist computer, friendly, short sentences
  narrator: ['Daniel', 'George', 'Alice'],
};
const SETTINGS = { pip: { stability: 0.75, similarity_boost: 0.7, style: 0, speed: 1.05 } };

const env = Object.fromEntries((fs.existsSync(path.join(ROOT, '.env')) ? fs.readFileSync(path.join(ROOT, '.env'), 'utf8') : '').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const KEY = process.env.ELEVENLABS_API_KEY || env.ELEVENLABS_API_KEY;
if (!KEY) { console.error('No ELEVENLABS_API_KEY in .env'); process.exit(1); }
const api = (p, init = {}) => fetch('https://api.elevenlabs.io' + p, { ...init, headers: { 'xi-api-key': KEY, ...(init.headers || {}) } });

/** The same key the game computes: lower-case letters and digits of the line, hashed. */
export const lineKey = (say) => crypto.createHash('sha1').update(say.toLowerCase().replace(/[^a-z0-9]+/g, '')).digest('hex').slice(0, 16);

// ---- collect lines, story order: dialogue, events, endings, windows
const lines = []; const seen = new Set();
const walk = (o) => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { if (o.who && typeof o.say === 'string' && !o.say.includes('{')) { const k = lineKey(o.say); if (!seen.has(k)) { seen.add(k); lines.push({ who: o.who, say: o.say, key: k }); } } for (const v of Object.values(o)) walk(v); } };
for (const f of ['dialogue', 'events', 'endings', 'windows']) walk(JSON.parse(fs.readFileSync(path.join(ROOT, 'shared/design', f + '.json'), 'utf8')));

const voicesRes = await api('/v1/voices'); if (!voicesRes.ok) { console.error('ElevenLabs refused the key:', voicesRes.status, await voicesRes.text()); process.exit(1); }
const voices = (await voicesRes.json()).voices;
if (process.argv.includes('--list-voices')) { for (const v of voices) console.log(v.name, '|', v.voice_id, '|', v.category, '|', JSON.stringify(v.labels)); process.exit(0); }
const pick = {}; for (const [who, names] of Object.entries(CAST)) { const v = names.map((n) => voices.find((x) => x.name.toLowerCase().startsWith(n.toLowerCase()))).find(Boolean) ?? voices[0]; pick[who] = { id: v.voice_id, name: v.name }; }
console.log('cast:', Object.fromEntries(Object.entries(pick).map(([k, v]) => [k, v.name])));
const sub = await (await api('/v1/user/subscription')).json().catch(() => ({}));
console.log(`lines: ${lines.length}, characters: ${lines.reduce((a, l) => a + l.say.length, 0)}; credits used ${sub.character_count ?? '?'} of ${sub.character_limit ?? '?'}`);
if (process.argv.includes('--dry')) process.exit(0);

fs.mkdirSync(OUT, { recursive: true });
const indexPath = path.join(OUT, 'index.json');
const index = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath, 'utf8')) : { credit: 'Voices: SI-generated with ElevenLabs (synthetic voices, not real people).', model: MODEL, lines: {} };
let made = 0, skipped = 0;
for (const l of lines) {
  const file = path.join(OUT, l.key + '.pcm');
  if (fs.existsSync(file) && index.lines[l.key]) { skipped++; continue; }
  const v = pick[l.who] ?? pick.narrator;
  const r = await api(`/v1/text-to-speech/${v.id}?output_format=pcm_24000`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'audio/pcm' }, body: JSON.stringify({ text: l.say, model_id: MODEL, voice_settings: SETTINGS[l.who] ?? { stability: 0.5, similarity_boost: 0.75, style: 0.25, speed: 1.0 } }) });
  if (!r.ok) { const t = await r.text(); console.error(`stopped at line ${made + skipped + 1}/${lines.length}: ${r.status} ${t.slice(0, 200)}`); break; }
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  index.lines[l.key] = { who: l.who, voice: v.name, file: l.key + '.pcm', text: l.say };
  made++; if (made % 10 === 0) { fs.writeFileSync(indexPath, JSON.stringify(index, null, 1)); console.log(`recorded ${made}…`); }
}
fs.writeFileSync(indexPath, JSON.stringify(index, null, 1));
console.log(`recorded ${made}, already had ${skipped}, total ${Object.keys(index.lines).length}/${lines.length}`);
// copy into Unity
fs.mkdirSync(UNITY, { recursive: true });
for (const f of fs.readdirSync(OUT)) fs.copyFileSync(path.join(OUT, f), path.join(UNITY, f));
console.log('copied to', path.relative(ROOT, UNITY));
