// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
/**
 * shots-beauty.mjs — in-engine close-up "beauty shots" of the habitat and the ascent vehicle, before
 * (?hw=0, the old stand-in models) and after (the Blender-built hardware). Saved to docs/screens/.
 * Usage (preview server running): node scripts/shots-beauty.mjs [url]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:4173/plutonyx/';
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'screens');
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: false, args: ['--window-size=1920,1170', '--force-device-scale-factor=1', '--ignore-gpu-blocklist', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-features=CalculateNativeWinOcclusion', '--force_high_performance_gpu'] });
const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })).newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
for (const [tag, q] of [['before', '&hw=0'], ['after', '']]) {
  await page.goto(BASE + '?capture=1&q=high' + q, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__cap?.ready === true, null, { timeout: 120000 });
  await page.evaluate(() => { document.getElementById('ui').style.visibility = 'hidden'; });
  for (const [shot, tod] of [['beauty_hab', 0.292], ['beauty_hab2', 0.715], ['beauty_ship', 0.292], ['beauty_ship2', 0.30]]) {
    await page.evaluate(([s, t]) => { const w = window.__cap.world; w.todT = 1; w.tod = t; w.jump(s); for (let i = 0; i < 40; i++) window.__cap.step(1 / 30); }, [shot, tod]);
    await page.bringToFront();
    await page.screenshot({ path: path.join(OUT, `${shot}-${tag}.jpg`), type: 'jpeg', quality: 90 });
    console.log('saved', shot, tag);
  }
}
await browser.close();
