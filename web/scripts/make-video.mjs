// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
/**
 * make-video.mjs — assembles the Space Apps demo video from footage recorded by capture.mjs.
 * Every frame is the real game (no SI-generated imagery). English captions are burned in.
 * The official limit is 30 seconds: this script builds 29.8 s and checks the result with ffprobe.
 *
 * Usage (from web/): node scripts/make-video.mjs
 * Output: <repo>/docs/demo/plutonyx-demo-30s.mp4
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CAP = (process.env.PLUTONYX_ASSETS || 'D:/PlutonyX-assets') + '/cap';
const FFMPEG = process.env.FFMPEG || 'D:/Tools/ffmpeg/bin/ffmpeg.exe';
const FFPROBE = FFMPEG.replace(/ffmpeg(\.exe)?$/, 'ffprobe$1');
const game = JSON.parse(fs.readFileSync(path.join(REPO, 'shared/design/game.json'), 'utf8'));
const W = 1920, H = 1080, FPS = 30;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const dirs = fs.readdirSync(CAP);
const boardExtra = dirs.filter((d) => /^board_[23]/.test(d)).sort();

/** Lower-third caption. */
const lower = (big, small = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.78"/></linearGradient></defs>
<rect x="0" y="${H - 330}" width="${W}" height="330" fill="url(#g)"/>
<rect x="96" y="${H - 208}" width="10" height="${small ? 118 : 74}" fill="#5cc8f0"/>
<text x="132" y="${H - 150}" font-family="Segoe UI, Arial, sans-serif" font-weight="700" font-size="58" fill="#ffffff">${esc(big)}</text>
${small ? `<text x="134" y="${H - 98}" font-family="Segoe UI, Arial, sans-serif" font-weight="400" font-size="34" fill="#d5dee6">${esc(small)}</text>` : ''}
</svg>`;
/** Big centred card. */
const card = (kicker, big, small) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<rect width="${W}" height="${H}" fill="#05080c" fill-opacity="0.38"/>
<text x="${W / 2}" y="${H / 2 - 110}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-weight="600" font-size="34" letter-spacing="10" fill="#9fb0bf">${esc(kicker)}</text>
<text x="${W / 2}" y="${H / 2 + 20}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-weight="700" font-size="${big.length > 16 ? 104 : 138}" letter-spacing="${big.length > 16 ? 6 : 18}" fill="#ffffff">${esc(big)}</text>
<rect x="${W / 2 - 300}" y="${H / 2 + 56}" width="600" height="3" fill="#5cc8f0"/>
${small.map((t, i) => `<text x="${W / 2}" y="${H / 2 + 128 + i * 52}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-weight="400" font-size="38" fill="#e8edf2">${esc(t)}</text>`).join('')}
</svg>`;

// [clip, first frame, frame count, overlay svg]  — 894 frames = 29.8 s
const PLAN = [
  ['title', 20, 60, card('NASA SPACE APPS CHALLENGE 2026', 'TEAM PLUTONYX', [])],
  ['flyover', 0, 90, lower('Challenge: Build a Junior Astronaut Mission Trainer', 'Kids hear that space is dangerous. They rarely get to feel why.')],
  ['flyover', 90, 150, card('A JUNIOR ASTRONAUT MISSION TRAINER', game.title, ['Keep your crew alive on Mars, where every choice costs something', 'and the real Sun decides how hard it gets.'])],
  ['board_a', 0, 75, lower('Share out real power: air, food, shield, science', 'Ten sols. Three meters. You can never have everything.')],
  [boardExtra[0] ?? 'board_a', 0, 15, lower('Share out real power: air, food, shield, science', 'Ten sols. Three meters. You can never have everything.')],
  ['event', 20, 75, lower('Every choice costs something', 'Consequences arrive sols later, with a "because you…" line.')],
  ['data', 20, 75, lower('Real NASA data, shown in the game', 'DONKI space weather · Curiosity rover radiation · real Jezero terrain')],
  ['storm', 60, 60, lower('Sol 8 was 20 May 2024. The storm really happened.', "The biggest radiation surge NASA's Curiosity has measured on Mars.")],
  ['storm_earth', 10, 90, lower('Earth is 16 light-minutes away', 'The answer cannot arrive in time. You decide alone.')],
  ['launch', 70, 120, lower('Seven endings. Nobody dies. Everything is explained.', 'Free in any browser · Cadet, Commander and Classroom modes')],
  ['sunset', 20, 84, card('PLAY IT NOW', 'darkcursader.github.io/plutonyx', ['Next: more real storms, more sites, Desktop Ultra edition', 'Team PlutonyX · built on real NASA data'])],
];

const out = path.join(CAP, 'demo'); fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
let n = 0;
for (const [clip, start, count, svg] of PLAN) {
  const dir = path.join(CAP, clip);
  const have = fs.existsSync(dir) ? fs.readdirSync(dir).length : 0;
  if (!have) throw new Error(`missing footage: ${clip}`);
  const overlay = await sharp(Buffer.from(svg)).png().toBuffer();
  for (let i = 0; i < count; i++) {
    const src = path.join(dir, `f_${String(Math.min(have - 1, start + i)).padStart(4, '0')}.jpg`);
    await sharp(src).resize(W, H).composite([{ input: overlay }]).jpeg({ quality: 95 }).toFile(path.join(out, `f_${String(n++).padStart(4, '0')}.jpg`));
  }
  console.log(clip, count, 'frames');
}
const seconds = n / FPS;
const dest = path.join(REPO, 'docs', 'demo'); fs.mkdirSync(dest, { recursive: true });
const mp4 = path.join(dest, 'plutonyx-demo-30s.mp4');
// soundtrack generated by ffmpeg itself: a low drone and soft filtered noise (no recordings)
const audio = `sine=f=55:d=${seconds},volume=0.20[a1];sine=f=82.4:d=${seconds},volume=0.11[a2];sine=f=110:d=${seconds},volume=0.07[a3];anoisesrc=d=${seconds}:c=brown:a=0.22,lowpass=f=420[a4];[a1][a2][a3][a4]amix=inputs=4:normalize=0,afade=t=in:d=1.5,afade=t=out:st=${seconds - 2.2}:d=2.2[a]`;
execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(out, 'f_%04d.jpg'), '-filter_complex', `[0:v]fade=t=in:d=0.4,fade=t=out:st=${seconds - 0.5}:d=0.5,format=yuv420p[v];${audio}`, '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-r', String(FPS), '-c:a', 'aac', '-b:a', '160k', '-t', String(seconds), '-movflags', '+faststart', mp4], { stdio: 'inherit' });
const dur = Number(execFileSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4]).toString().trim());
console.log(`demo: ${mp4}\n      ${n} frames · ${dur.toFixed(3)} s · ${(fs.statSync(mp4).size / 1048576).toFixed(1)} MB`);
if (dur > 30) throw new Error('VIDEO IS LONGER THAN 30 SECONDS — not eligible. Shorten the plan.');
