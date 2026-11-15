// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
/**
 * capture.mjs — records frame-perfect footage of the REAL game (our own assets, real-time renderer) for
 * cutscenes and the 30-second demo. Nothing here is SI-generated imagery: every frame is the game itself.
 *
 * The game runs in "capture mode" (?capture=1): the 3D world only advances when this script asks for the
 * next 1/30 s, so every clip is exactly 30 fps no matter how slow the machine is. A visible Chromium
 * window is used so the real GPU renders at full quality.
 *
 * Usage (dev server running):  node scripts/capture.mjs [clip names…]
 * Output: <cache>/cap/<clip>/f_0000.jpg …   → encode with scripts/make-video.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.CAPTURE_URL || 'http://localhost:5173/plutonyx/';
const OUT = (process.env.PLUTONYX_ASSETS || 'D:/PlutonyX-assets') + '/cap';
const W = 1920, H = 1080, FPS = 30;
const want = process.argv.slice(2);
const on = (name) => !want.length || want.includes(name);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ headless: false, args: [`--window-size=${W},${H + 90}`, '--force-device-scale-factor=1', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-features=CalculateNativeWinOcclusion'] });
const page = await (await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })).newPage();
page.on('pageerror', (e) => console.error('PAGE ERROR', e.message));
await page.goto(BASE + '?capture=1&q=high', { waitUntil: 'load' });
await page.waitForFunction(() => window.__cap?.ready === true, null, { timeout: 120000 });
console.log('game ready');

async function clip(name, seconds, { ui = true } = {}) {
  const dir = path.join(OUT, name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  await page.evaluate((v) => { document.getElementById('ui').style.visibility = v ? '' : 'hidden'; }, ui);
  const n = Math.round(seconds * FPS), t0 = Date.now();
  for (let i = 0; i < n; i++) {
    await page.evaluate((dt) => window.__cap.step(dt), 1 / FPS);
    await page.screenshot({ path: path.join(dir, `f_${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 96 });
  }
  await page.evaluate(() => { document.getElementById('ui').style.visibility = ''; });
  console.log(`clip ${name}: ${n} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
/** Let the world run for a while without recording (finishes camera moves and light changes). */
const settle = (seconds) => page.evaluate(async ([s, fps]) => { for (let i = 0; i < s * fps; i++) window.__cap.step(1 / fps); }, [seconds, FPS]);
const world = (fn, arg) => page.evaluate(`(${fn})(window.__cap.world, ${JSON.stringify(arg ?? null)})`);
const eyebrow = () => page.evaluate(() => document.querySelector('.panel .eyebrow')?.textContent || document.querySelector('.screen .eyebrow')?.textContent || '');

// ---------------------------------------------------------------- cinematic clips (no interface)
if (on('title')) { await world((w) => { w.todT = 1; w.tod = 0.281; w.jump('title'); }); await settle(2); await clip('title', 6, { ui: false }); }
if (on('flyover')) { await world((w) => { w.todT = 1; w.tod = 0.30; w.orbit([0, -30], 150, 16, 0.085, 2.2); }); await settle(1); await clip('flyover', 9, { ui: false }); }
if (on('sunset')) { await world((w) => { w.todT = 1; w.tod = 0.724; w.orbit([-10, -36], 95, 5, 0.06, 0.2); }); await settle(1); await clip('sunset', 6, { ui: false }); }

// ---------------------------------------------------------------- real gameplay (interface visible)
const clickPrimary = () => page.evaluate(() => { const s = document.querySelector('.skip'); if (s) return s.click(); const scope = document.querySelector('.screen') || document.querySelector('.panel'); (scope?.querySelector('.choice:not([disabled])') || scope?.querySelector('.btn.primary'))?.click(); });
async function advanceUntil(re, max = 400) { for (let i = 0; i < max; i++) { await settle(0.4); await sleep(120); if (re.test(await eyebrow())) return true; await clickPrimary(); } return false; }

if (on('board') || on('event') || on('storm') || on('data') || on('night')) {
  await page.evaluate(() => document.querySelector('.title .btn.primary').click()); await sleep(300);
  await page.evaluate(() => [...document.querySelectorAll('.screen .choice')][0].click()); await sleep(300);   // Cadet
  await advanceUntil(/Power board/);
  await settle(4); await sleep(900);
  if (on('board')) {
    await clip('board_a', 2.5);
    for (const k of [2, 2, 3]) { await page.evaluate((i) => document.querySelectorAll('.sys .step button:last-child')[i].click(), k); await sleep(250); await clip('board_' + k + Math.random().toString(36).slice(2, 5), 0.9); }
  }
  await page.evaluate(() => document.querySelector('.panel .btn.primary').click());
  await advanceUntil(/message in pieces/); await settle(3); await sleep(900);
  if (on('event')) await clip('event', 4.5);
  if (on('data')) { await page.evaluate(() => document.querySelector('.panel .chip')?.click()); await sleep(900); await clip('data', 4); await page.evaluate(() => document.querySelector('.screen .btn.primary')?.click()); }
  if (on('storm') || on('night')) {
    await advanceUntil(/Solar storm/); await settle(5); await sleep(900);
    if (on('storm')) await clip('storm', 6);
    await advanceUntil(/Call Earth/); await settle(3); await sleep(900);
    if (on('storm')) await clip('storm_earth', 4);
    await advanceUntil(/Night · Sol 8/); await settle(3); await sleep(900);
    if (on('night')) await clip('night', 4);
  }
}

// ---------------------------------------------------------------- the launch
if (on('launch')) {
  await page.goto(BASE + '?capture=1&q=high', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__cap?.ready === true, null, { timeout: 120000 });
  await world((w) => { w.todT = 1; w.tod = 0.722; w.setLook('gold'); w.jump('launch'); w.startLaunch(); });
  await clip('launch', 9, { ui: false });
}
await browser.close();
console.log('capture done →', OUT);
