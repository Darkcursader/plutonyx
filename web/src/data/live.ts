// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
/**
 * live.ts — LIVE space weather. Fetches the last 30 days of DONKI records straight from the CCMC service
 * (CCMC endpoint: no key, browser requests allowed; api.nasa.gov as second choice) and reduces them with
 * the SAME code that built the archived files. If the service cannot be reached, the game falls back to the
 * archived snapshot and says so. Live data is never faked and archived data is never called live.
 */
// @ts-ignore — plain JS module shared with the Node archive script
import * as SW from '@shared/scripts/lib/spaceweather.mjs';
import balance from '@shared/design/balance.json';
import { loadArchive, injectArchivedStorm } from './windows';

export interface LiveState {
  mode: 'loading' | 'live' | 'archived';
  days: any[];               // up to 31 real day summaries, oldest first
  start: string; end: string;
  fetchedAt: string | null;  // local time string when live
  headline: string;          // "calm" | "active" | "storm"
  detail: string;
  error?: string;
}

const CACHE_KEY = 'plutonyx.live.v1';
const SOLS = (balance as any).missionSols;
export const live: LiveState = { mode: 'loading', days: [], start: '', end: '', fetchedAt: null, headline: '', detail: 'Asking the space-weather service about the Sun…' };

async function getJson(type: string, start: string, end: string): Promise<any[]> {
  let last: unknown;
  for (const src of SW.DONKI_SOURCES) {
    try {
      const r = await fetch(src.url(type, start, end), { signal: AbortSignal.timeout(20000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const t = await r.text();
      return t.trim() ? JSON.parse(t) : [];
    } catch (e) { last = e; }
  }
  throw last;
}

function describe(days: any[]) {
  const recent = days.slice(-3);
  const flare = Math.max(...recent.map((d) => d.game.flareLevel)), storm = Math.max(...recent.map((d) => d.game.stormLevel));
  const top = [...recent].sort((a, b) => SW.flareFlux(b.flares.max) - SW.flareFlux(a.flares.max))[0];
  const headline = storm >= 2 || flare >= 2 ? 'storm' : flare >= 1 ? 'active' : 'calm';
  const what = top?.flares.max ? `biggest flare in the last 3 days: class ${top.flares.max}` : 'no flares above class C in the last 3 days';
  return { headline, what };
}

export async function initLive(): Promise<LiveState> {
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
    if (cached && Date.now() - cached.t < 3600_000) { Object.assign(live, cached.live); return live; }
  } catch { /* no cache */ }
  const end = SW.isoDate(Date.now()), start = SW.addDays(end, -30);
  try {
    const donki: Record<string, any[]> = {};
    await Promise.all(SW.DONKI_TYPES.map(async (type: string) => {
      donki[type] = SW.trimDonki(type, await getJson(type, type === 'WSAEnlilSimulations' ? SW.addDays(start, -4) : start, end));
    }));
    const { days } = SW.deriveGame(SW.buildDays({ start, end, donki }), (balance as any).spaceWeather);
    const { headline, what } = describe(days);
    const at = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    Object.assign(live, { mode: 'live', days, start, end, fetchedAt: at, headline, detail: `Live space weather · fetched ${at} · ${what}. Radiation on Mars is estimated in live missions (rover data arrives months later).` });
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), live })); } catch { /* ignore */ }
  } catch (e) {
    const file = await loadArchive('recent');
    const { headline, what } = describe(file.days);
    Object.assign(live, { mode: 'archived', days: file.days, start: file.meta.start, end: file.meta.end, fetchedAt: null, headline, error: String(e), detail: `The live service could not be reached, so this is real archived data from ${file.meta.start} to ${file.meta.end} (archived) · ${what}.` });
  }
  return live;
}

/** The 10 real days a "today's real sky" mission runs on, and whether the archived storm had to be added. */
export function liveMissionDays(): { days: any[]; injected: boolean; label: string } {
  const all = live.days.map((d) => structuredClone(d));
  const i = SW.pickWindow(all, SOLS, (balance as any).spaceWeather.peakSol);
  const days = all.slice(i, i + SOLS);
  const injected = injectArchivedStorm(days);
  return { days, injected, label: `${days[0].date} to ${days[days.length - 1].date}` };
}
