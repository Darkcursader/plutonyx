// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
/**
 * windows.ts — turns an archived (or live) record of real days into the 10 days of one mission.
 * Archived files: shared/data/spaceweather/*.json (made by shared/scripts/fetch-spaceweather.mjs).
 */
import may2024 from '@shared/data/spaceweather/may-2024.json';
import windowsJson from '@shared/design/windows.json';
import balance from '@shared/design/balance.json';

export const WINDOWS: any[] = (windowsJson as any).windows;
export const STORY: any = may2024;
const SOLS = (balance as any).missionSols;

export async function loadArchive(id: string): Promise<any> {
  if (id === 'may-2024') return STORY;
  const lazy = import.meta.glob('../../../shared/data/spaceweather/*.json');
  const key = Object.keys(lazy).find((k) => k.endsWith(`/${id}.json`));
  if (!key) throw new Error(`No archived window "${id}"`);
  return ((await lazy[key]()) as any).default;
}

/** Ten consecutive real days starting at `sol1` (YYYY-MM-DD). */
export function sliceDays(file: any, sol1: string): any[] {
  const i = Math.max(0, file.days.findIndex((d: any) => d.date === sol1));
  const start = Math.min(i, Math.max(0, file.days.length - SOLS));
  return file.days.slice(start, start + SOLS).map((d: any) => structuredClone(d));
}

/**
 * A calm window has no storm of level 2+. To keep the mission's climax, sols 8 and 9 then replay the
 * archived real storm of 20-21 May 2024. The copied days are marked so the UI labels them ARCHIVED.
 */
export function injectArchivedStorm(days: any[]): boolean {
  const cfg = (balance as any).spaceWeather;
  if (days.some((d) => d.game.stormLevel >= 2)) return false;
  cfg.calmWindowStorm.dates.forEach((date: string, k: number) => {
    const src = STORY.days.find((d: any) => d.date === date);
    const dst = days[cfg.peakSol - 1 + k];
    if (!src || !dst) return;
    dst.rad = structuredClone(src.rad);
    dst.game = { ...structuredClone(src.game), flareLevel: dst.game.flareLevel, radioNoise: dst.game.radioNoise, injectedFrom: date };
    dst.cmes = { ...dst.cmes, injected: structuredClone(src.cmes) };
  });
  return true;
}

export const storyDays = () => sliceDays(STORY, WINDOWS.find((w) => w.id === 'may-2024').sol1);
