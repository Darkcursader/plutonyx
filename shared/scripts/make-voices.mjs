// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
/**
 * make-voices.mjs — records every fixed dialogue line with ElevenLabs synthetic voices (SI-generated audio).
 * The ElevenLabs SDK reads ELEVENLABS_API_KEY from the environment; it lives in the repo's .env.local (gitignored,
 * written by `npx @elevenlabs/cli onboard`). Run with: cd shared/scripts && npm install && npm run voices [-- --dry]
 * Lines with live numbers ({...}) are skipped: the game reads those with the computer's own voice.
 * Only ElevenLabs' premade voices are used (free plans cannot use Voice Library voices). All adult voices.
 * Output: shared/audio/voices/<key>.pcm (raw 16-bit mono PCM, 24 kHz) + index.json, copied into the Unity StreamingAssets.
 * Already-recorded lines are skipped, so a run that stops at the monthly limit can simply be repeated next month.
 *
 * Flags: --list-voices, --dry, --limit <n>, --model <id> (default: eleven_v4 if the credits left cover it, else eleven_flash_v2_5)
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'shared/audio/voices');
const UNITY = path.join(ROOT, 'desktop/Assets/StreamingAssets/voices');
// speaker → preferred premade voices (first one the account has wins).
const CAST = {
  ana: ['Sarah', 'Laura', 'Matilda', 'Alice'],     // botanist, 38, warm and patient
  dil: ['Jessica', 'Laura', 'Lily', 'Alice'],      // geologist, 31, quick and curious
  kofi: ['Brian', 'Chris', 'Eric', 'Roger'],       // engineer, 44, calm, dry humour
  sam: ['Bill', 'George', 'Daniel', 'Roger'],      // flight director on Earth, 55, steady and kind
  pip: ['River', 'Alice', 'Lily', 'Matilda'],      // wrist computer, friendly, short sentences
  narrator: ['George', 'Daniel', 'Alice'],
};

if (!process.env.ELEVENLABS_API_KEY) { console.error('No ELEVENLABS_API_KEY: run with `npm run voices` (loads ../../.env.local).'); process.exit(1); }
const client = new ElevenLabsClient();
const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : undefined; };

/** The same key the game computes: lower-case letters and digits of the line, hashed. */
export const lineKey = (say) => crypto.createHash('sha1').update(say.toLowerCase().replace(/[^a-z0-9]+/g, '')).digest('hex').slice(0, 16);

// ---- collect lines, story order: dialogue, events, endings, windows
const lines = []; const seen = new Set();
const walk = (o) => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { // two shapes: {who, say: line} (dialogue) and {say: who, text: line} (event outcomes)
  const who = o.who ?? (typeof o.text === 'string' && typeof o.say === 'string' ? o.say : null), say = o.who ? o.say : o.text;
  if (who && typeof say === 'string' && !say.includes('{')) { const k = lineKey(say); if (!seen.has(k)) { seen.add(k); lines.push({ who, say, key: k }); } } for (const v of Object.values(o)) walk(v); } };
for (const f of ['dialogue', 'events', 'endings', 'windows']) walk(JSON.parse(fs.readFileSync(path.join(ROOT, 'shared/design', f + '.json'), 'utf8')));

const all = (await client.voices.getAll()).voices;
const voices = all.filter((v) => v.category === 'premade');
if (process.argv.includes('--list-voices')) { for (const v of voices) console.log(v.name, '|', v.voiceId, '|', JSON.stringify(v.labels)); process.exit(0); }
const pick = {}; for (const [who, names] of Object.entries(CAST)) { const v = names.map((n) => voices.find((x) => x.name.toLowerCase().startsWith(n.toLowerCase()))).find(Boolean) ?? voices[0]; pick[who] = { id: v.voiceId, name: v.name }; }

const fs0 = fs.existsSync(path.join(OUT, 'index.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'index.json'), 'utf8')) : null;
const todo0 = lines.filter((l) => !(fs0?.lines?.[l.key] && fs.existsSync(path.join(OUT, l.key + '.pcm'))));
const todo = arg('--limit') ? todo0.slice(0, +arg('--limit')) : todo0;
const chars = todo.reduce((a, l) => a + l.say.length, 0);
const sub = await client.user.subscription.get().catch(() => ({}));
const left = (sub.characterLimit ?? 0) - (sub.characterCount ?? 0);
const MODEL = arg('--model') ?? fs0?.model ?? (left >= chars * 1.05 ? 'eleven_v4' : 'eleven_flash_v2_5');
const V4 = MODEL.startsWith('eleven_v4');
console.log('cast:', Object.fromEntries(Object.entries(pick).map(([k, v]) => [k, v.name])));
console.log(`lines: ${lines.length} (${todo.length} to record, ${chars} characters); credits used ${sub.characterCount ?? '?'} of ${sub.characterLimit ?? '?'}; model ${MODEL}`);
if (process.argv.includes('--dry')) process.exit(0);

const settings = (who) => V4
  ? { stability: who === 'pip' ? 0.75 : 0.5, similarityBoost: 0.75 }
  : (who === 'pip' ? { stability: 0.75, similarityBoost: 0.7, style: 0, speed: 1.05 } : { stability: 0.5, similarityBoost: 0.75, style: 0.25, speed: 1.0 });

fs.mkdirSync(OUT, { recursive: true });
const indexPath = path.join(OUT, 'index.json');
const index = fs0 ?? { credit: 'Voices: SI-generated with ElevenLabs (synthetic voices, not real people).', model: MODEL, lines: {} };
let made = 0;
for (const l of todo) {
  const v = pick[l.who] ?? pick.narrator;
  try {
    const stream = await client.textToSpeech.convert(v.id, { text: l.say, modelId: MODEL, outputFormat: 'pcm_24000', voiceSettings: settings(l.who), applyTextNormalization: 'on' });
    const buf = Buffer.from(await new Response(stream).arrayBuffer());
    fs.writeFileSync(path.join(OUT, l.key + '.pcm'), buf);
  } catch (e) { console.error(`stopped after ${made}/${todo.length}: ${e.statusCode ?? ''} ${String(e.body ? JSON.stringify(e.body) : e.message).slice(0, 200)}`); break; }
  index.lines[l.key] = { who: l.who, voice: v.name, model: MODEL, file: l.key + '.pcm', text: l.say };
  made++; if (made % 10 === 0) { fs.writeFileSync(indexPath, JSON.stringify(index, null, 1)); console.log(`recorded ${made}…`); }
}
fs.writeFileSync(indexPath, JSON.stringify(index, null, 1));
console.log(`recorded ${made}, total ${Object.keys(index.lines).length}/${lines.length}`);
// copy into Unity
fs.mkdirSync(UNITY, { recursive: true });
for (const f of fs.readdirSync(OUT)) fs.copyFileSync(path.join(OUT, f), path.join(UNITY, f));
console.log('copied to', path.relative(ROOT, UNITY));
