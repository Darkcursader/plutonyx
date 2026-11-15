// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
/** Deterministic PRNG shared with the Unity edition (shared/design/SCHEMA.md §6). */
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mission code shown to players: "<windowId>-<SEED in base 36>". Contains no personal data. */
export const missionCode = (windowId: string, seed: number) => `${windowId}-${(seed >>> 0).toString(36).toUpperCase()}`;
export function parseMissionCode(code: string): { windowId: string; seed: number } | null {
  const i = code.lastIndexOf('-');
  if (i < 1) return null;
  const seed = parseInt(code.slice(i + 1), 36);
  return Number.isFinite(seed) ? { windowId: code.slice(0, i).toLowerCase(), seed: seed >>> 0 } : null;
}
export const randomSeed = () => (Math.floor(Math.random() * 0xffffffff) ^ Date.now()) >>> 0;
