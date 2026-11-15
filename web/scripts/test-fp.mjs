// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
/**
 * test-fp.mjs — an honest, automated check of first-person mode:
 *   frame rate (inside and outside), walking with real key presses, mouse look, wall collision, doors,
 *   then a complete mission played to an ending (the script moves the astronaut to each objective and
 *   presses E / uses the tablet like a player). Records a video of the session.
 * Usage (preview server running): node scripts/test-fp.mjs [url] [gpu=nvidia|default]
 */
import fs from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:4173/plutonyx/';
const GPU = process.argv[3] || 'nvidia';
const REC = (process.env.PLUTONYX_ASSETS || 'D:/PlutonyX-assets') + '/rec';
fs.rmSync(REC, { recursive: true, force: true }); fs.mkdirSync(REC, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const args = ['--window-size=1280,810', '--force-device-scale-factor=1', '--ignore-gpu-blocklist', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-features=CalculateNativeWinOcclusion'];
if (GPU === 'nvidia') args.push('--force_high_performance_gpu');
const browser = await chromium.launch({ headless: false, args });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, recordVideo: { dir: REC, size: { width: 1280, height: 720 } } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/WebSocket|favicon/.test(m.text())) errors.push('console: ' + m.text().slice(0, 160)); });
const R = { gpu: GPU };
const fps = () => page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 4000) requestAnimationFrame(f); else res(Math.round(n / ((performance.now() - t0) / 1000))); }; requestAnimationFrame(f); }));
const st = () => page.evaluate(() => { const m = window.__game.fpm, f = m.fp, t = f.target; return { zone: f.zone, x: +f.pos.x.toFixed(2), z: +f.pos.z.toFixed(2), y: +f.pos.y.toFixed(2), o2: Math.round(f.o2), raised: f.tablet.raised, panel: !!document.querySelector('.tablet-content .panel'), target: t ? { id: t.id, x: t.x, z: t.z, zone: t.zone || 'outside' } : null, hold: f.hold ? f.hold.need : 0, debrief: /debrief/i.test(document.querySelector('.screen .eyebrow')?.textContent || ''), screen: !!document.querySelector('.screen'), skip: !!document.querySelector('.skip'), sol: window.__game.mission?.s.sol, q: window.__game.world.quality, deg: window.__game.world.degradeLevel }; });

await page.goto(BASE + '?fp=1', { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game?.fpm && !document.getElementById('boot'), null, { timeout: 120000 });
R.gpuName = await page.evaluate(() => { const gl = window.__game.world.renderer.getContext(); const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : '?'; });
R.fpsTitle = await fps();
await page.evaluate(() => document.querySelector('.title .btn.primary').click()); await sleep(400);
await page.evaluate(() => [...document.querySelectorAll('.screen .choice')][0].click()); await sleep(900);
await page.evaluate(() => document.querySelector('.skip')?.click());
await page.waitForFunction(() => !!document.querySelector('.tablet-content .panel .btn.primary') && window.__game.fpm.fp.tablet.raised, null, { timeout: 30000 }); await sleep(1500);
await page.evaluate(() => document.querySelector('.tablet-content .btn.primary')?.click());   // close the morning report
await page.waitForFunction(() => !window.__game.fpm.fp.tablet.raised, null, { timeout: 15000 }); await sleep(1200);
// --- walking with real input
await page.mouse.click(640, 300); await sleep(500);
R.pointerLock = await page.evaluate(() => document.pointerLockElement === window.__game.world.renderer.domElement);
R.fpsInside = await fps();
const a = await st();
await page.mouse.move(700, 310, { steps: 6 }); await sleep(200);
await page.keyboard.down('KeyW'); await sleep(1500); await page.keyboard.up('KeyW');
const b = await st();
R.walkedMetres = +Math.hypot(b.x - a.x, b.z - a.z).toFixed(2);
// --- door: go outside through the airlock
await page.evaluate(() => { const f = window.__game.fpm.fp; f.pos.set(0, f.pos.y, -34.0); f.yaw = Math.PI; }); await sleep(300);
await page.keyboard.press('KeyE'); await sleep(1500);
R.doorToOutside = (await st()).zone === 'outside';
await page.evaluate(() => { const f = window.__game.fpm.fp; f.pos.set(14, 0, -8); f.yaw = 0.45; f.pitch = 0.05; }); await sleep(600);
R.fpsOutside = await fps();
// --- collision: walk straight at the habitat drum for 5 s; the astronaut must stay outside its wall
await page.evaluate(() => { const f = window.__game.fpm.fp; f.pos.set(0, 0, -20); f.yaw = 0; f.pitch = 0; }); await sleep(200);
await page.keyboard.down('KeyW'); await sleep(5000); await page.keyboard.up('KeyW');
const c = await st();
R.blockedByHabitat = Math.hypot(c.x - 0, c.z + 38) > 6.0 || Math.hypot(c.x, c.z + 31.6) > 2.0;
R.stoppedAt = [c.x, c.z];
// --- jump under Mars gravity: time in the air
await page.evaluate(() => { const f = window.__game.fpm.fp; f.pos.set(8, 0, -14); f.pos.y = f.floorY(); }); await sleep(400);
await page.keyboard.press('Space'); const tj = Date.now(); await sleep(150);
for (let i = 0; i < 60; i++) { const s = await st(); const g = await page.evaluate(() => window.__game.fpm.fp.grounded); if (g) break; await sleep(50); }
R.jumpAirSeconds = +((Date.now() - tj) / 1000).toFixed(2);
// --- now play the whole mission the way a player would, but teleporting to each objective
const QUICK = process.argv.includes("quick");
const t0 = Date.now(); let ending = QUICK ? "(skipped)" : null, steps = 0; const visited = new Set();
for (; steps < 900 && !ending; steps++) {
  const s = await st();
  if (s.debrief) { ending = await page.evaluate(() => document.querySelector('.screen h1')?.textContent); break; }
  if (s.skip) { await page.evaluate(() => document.querySelector('.skip')?.click()); await sleep(250); continue; }
  if (s.screen) { await page.evaluate(() => document.querySelector('.screen .btn.primary')?.click()); await sleep(300); continue; }
  if (s.panel && s.raised) { await page.evaluate(() => { const p = document.querySelector('.tablet-content .panel'); (p.querySelector('.choice:not([disabled])') || p.querySelector('.btn.primary'))?.click(); }); await sleep(380); continue; }
  if (s.target) {
    visited.add(s.target.id);
    await page.evaluate((t) => { const f = window.__game.fpm.fp; f.zone = t.zone; f.pos.set(t.x, 0, t.z); f.pos.y = f.floorY(); f.vy = 0; }, s.target); await sleep(250);
    if (s.hold) { await page.keyboard.down('KeyE'); await sleep(s.hold * 1000 + 700); await page.keyboard.up('KeyE'); } else await page.keyboard.press('KeyE');
    await sleep(500); continue;
  }
  await sleep(350);
}
R.missionEnding = ending; R.missionSteps = steps; R.missionSeconds = Math.round((Date.now() - t0) / 1000);
R.stationsVisited = [...visited].join(', ');
R.end = await page.evaluate(() => ({ sol: window.__game.mission?.s.sol, quality: window.__game.world.quality, effectsStepDown: window.__game.world.degradeLevel }));
R.errors = errors.slice(0, 8);
console.log(JSON.stringify(R, null, 1));
await ctx.close(); await browser.close();
console.log('VIDEO', fs.readdirSync(REC).join(','));
