// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
/** store.ts — settings and progress in localStorage. No personal data, no network. Every access is wrapped in try/catch. */
const KEY = 'plutonyx.v1';

const defaults = {
  settings: { quality: 'auto' as 'auto' | 'low' | 'high' | 'ultra', volume: 0.7, readAloud: false, textSize: 1, reducedMotion: false, colorBlind: false, planner: false },
  endings: {} as Record<string, boolean>,
  achievements: {} as Record<string, boolean>,
  missions: 0,
  resume: null as null | { cfg: { difficulty: string; seed: number; windowId: string; kind: string }; decisions: any[] },
};

export const store = {
  data: structuredClone(defaults),
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const j = JSON.parse(raw); this.data = { ...structuredClone(defaults), ...j, settings: { ...defaults.settings, ...(j.settings || {}) } }; }
      if (matchMedia('(prefers-reduced-motion: reduce)').matches && !raw) this.data.settings.reducedMotion = true;
    } catch { /* private mode or blocked storage: play without saving */ }
  },
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* ignore */ } },
};
