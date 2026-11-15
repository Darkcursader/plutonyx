// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
/**
 * shots-fp.mjs — takes 1080p screenshots of first-person mode for review (docs/screens/fp-*.jpg).
 * Usage (dev or preview server running): node scripts/shots-fp.mjs [url]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:5173/plutonyx/';
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'screens');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: false, args: ['--window-size=1920,1170', '--force-device-scale-factor=1', '--ignore-gpu-blocklist', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-features=CalculateNativeWinOcclusion', '--force_high_performance_gpu'] });
const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })).newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await page.goto(BASE + '?fp=1&q=high', { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game?.fpm && !document.getElementById('boot'), null, { timeout: 120000 });
const shot = async (name) => { await page.bringToFront(); await sleep(400); await page.screenshot({ path: path.join(OUT, name + '.jpg'), type: 'jpeg', quality: 90 }); console.log('saved', name); };
const fp = (fn, arg) => page.evaluate(`(${fn})(window.__game.fpm, ${JSON.stringify(arg ?? null)})`);

await page.evaluate(() => document.querySelector('.title .btn.primary').click()); await sleep(400);
await page.evaluate(() => [...document.querySelectorAll('.screen .choice')][0].click()); await sleep(900);
await page.evaluate(() => document.querySelector('.skip')?.click());
await sleep(4500);
await shot('fp-1-tablet-morning-report');
await page.evaluate(() => document.querySelector('.tablet-content .btn.primary').click());
await sleep(2500);
await shot('fp-2-command-deck-objective');
// walk to the power board and use it
await fp((m) => { m.fp.pos.set(3.2, m.fp.pos.y, -38); m.fp.yaw = -Math.PI / 2; m.fp.pitch = 0.05; });
await sleep(700);
await page.keyboard.press('KeyE'); await sleep(2800);
await shot('fp-3-tablet-power-routing');
await page.evaluate(() => document.querySelector('.tablet-content .btn.primary').click()); await sleep(2200);
// tablet home tabs
await page.keyboard.press('Tab'); await sleep(1800);
await page.evaluate(() => document.querySelector('.tablet-tabs button[data-tab="shield"]').click()); await sleep(600);
await shot('fp-4-tablet-shielding-tab');
await page.keyboard.press('Tab'); await sleep(900);
// outside: by the airlock looking at the base, then at the solar field
await fp((m) => { m.fp.zone = 'outside'; m.fp.pos.set(14, 0, -6); m.fp.yaw = 0.42; m.fp.pitch = 0.06; });
await sleep(1500);
await shot('fp-5-outside-base');
await fp((m) => { m.fp.pos.set(-30, 0, -28); m.fp.yaw = -1.9; m.fp.pitch = 0.08; });
await sleep(1500);
await shot('fp-6-outside-greenhouse');
await browser.close();
