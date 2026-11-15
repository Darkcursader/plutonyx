// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
/**
 * ui.ts — the in-mission interface: wrist gauges, dawn briefing, power board, event cards, storm steps, night report.
 * All HTML/CSS (vector, sharp at any zoom). Every async method resolves when the player is done with that panel.
 */
import crewJson from '@shared/design/crew.json';
import sourcesJson from '@shared/design/sources.json';
import glossaryJson from '@shared/design/glossary.json';
import { BAL, DLG, allocCost, available, preview, canAfford, choiceState, tokens, fill, dayOf, shieldNeed, type Mission, type Alloc, type SystemId, type DawnReport, type NightReport, type EventInst, type Line, type ChoiceResult } from '../sim/engine';

export const CREW: Record<string, any> = Object.fromEntries((crewJson as any).crew.map((c: any) => [c.id, c]));
/** The challenge allows no agency branding in the game, so source names are shown without it (full credits stay in shared/references.md). */
export const noBrand = (t: string) => String(t ?? '')
  .replace(/NASA Watches Mars Light Up/g, 'Mars Lights Up').replace(/NASA (Says|Achieves) /g, '').replace(/NASA's /g, '')
  .replace(/^NASA \(NTRS\)$/, 'Technical Reports Server (NTRS)').replace(/^NASA analysis/, 'An analysis').replace(/^NASA$/, 'Space agency news').replace(/^NASA Science$/, 'Planetary science explainers')
  .replace(/ESA\/NASA mission/g, 'joint ESA mission').replace(/NASA\/JPL\/MSSS/g, 'JPL/MSSS').replace(/NASA\/(USGS|JPL)/g, '$1')
  .replace(/NASA 3D Resources/g, 'Public 3D Resources').replace(/NASA (Images and )?Media Usage Guidelines/g, 'the media usage guidelines')
  .replace(/\bfor NASA /g, 'for ').replace(/\bNASA\s*/g, '').replace(/\s{2,}/g, ' ').trim();
export const SOURCES: Record<string, any> = Object.fromEntries((sourcesJson as any).sources.map((s: any) => [s.id, { ...s, org: noBrand(s.org), title: noBrand(s.title), use: noBrand(s.use), license: noBrand(s.license) }]));
export const GLOSSARY: any[] = (glossaryJson as any).terms;

type Child = Node | string | null | undefined | false;
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, any> = {}, ...kids: (Child | Child[])[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v; else if (k === 'html') el.innerHTML = v; else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else if (k === 'style') el.setAttribute('style', v); else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids.flat()) if (kid) el.append(kid);
  return el;
}

const PATHS: Record<string, string> = {
  air: 'M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8a2.5 2.5 0 1 1-2.5 2.5',
  power: 'M13 2 4 14h7l-1 8 9-12h-7z',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  sprout: 'M12 21v-9M12 12c0-4-3-6-7-6 0 4 3 6 7 6zM12 14c0-3 2.5-5 6-5 0 3-2.5 5-6 5z',
  water: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z',
  core: 'M9 3h6v15a3 3 0 0 1-6 0zM9 8h6M9 13h6',
  rover: 'M3 14h18v-4l-4-3H8l-5 3zM7 19a2.2 2.2 0 1 0 0-4.4A2.2 2.2 0 0 0 7 19zM17 19a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z',
  earth: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3.2 3 3.2 15 0 18M12 3c-3.2 3-3.2 15 0 18',
  dish: 'M4 21h9M8.5 21l2.5-6M4.5 9.5a8 8 0 0 0 10 10zM12 12l5-5M20 3.5v4h-4',
  warn: 'M12 3 2 20h20zM12 10v5M12 17.4v.4',
  food: 'M6 3v7a3 3 0 0 0 6 0V3M9 3v18M17 3c-2.2 2-2.2 8 0 9.5V21',
  badge: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8v4l3 2',
  menu: 'M4 7h16M4 12h16M4 17h16',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  smile: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8.5 14.5c1 1.4 2.2 2 3.5 2s2.5-.6 3.5-2M9 9.5v.5M15 9.5v.5',
  check: 'M4 12.5l5 5L20 6.5',
  wrench: 'M14.5 6.5a4 4 0 0 0-5 5L3 18l3 3 6.5-6.5a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5z',
  ring: 'M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14z',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2',
  book: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11',
};
export const icon = (name: string, color = 'currentColor') => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PATHS[name] ?? PATHS.ring}"/></svg>`;
const COLORS: Record<string, string> = { air: 'var(--ui-air)', power: 'var(--ui-power)', shield: 'var(--ui-shield)', plants: 'var(--ui-food)', food: 'var(--ui-food)', water: 'var(--ui-water)', science: 'var(--ui-science)', health: '#ff9db0', morale: '#ffd27a', dose: 'var(--ui-warn)', doseDil: 'var(--ui-warn)' };
const ICONS: Record<string, string> = { air: 'air', power: 'power', shield: 'shield', plants: 'sprout', food: 'food', water: 'water', science: 'core', health: 'heart', morale: 'smile', dose: 'badge', doseDil: 'badge' };
const NAMES: Record<string, string> = { air: 'Air', power: 'Power', shield: 'Shield', plants: 'Garden', food: 'Food', water: 'Water', science: 'Leopard Core', health: 'Crew health', morale: 'Morale', dose: 'Radiation badge', doseDil: "Dil's badge", fragments: 'Message piece', risk: 'Gamble', harvests: 'Harvest', earthAsks: 'Question to Earth', forecastsShown: '' };
const LEVELS = ['Off', 'Low', 'Normal', 'Boost'];
const SYS_COLOR: Record<SystemId, string> = { life: 'var(--ui-air)', garden: 'var(--ui-food)', shield: 'var(--ui-shield)', rover: 'var(--ui-science)' };
const SYS_ICON: Record<SystemId, string> = { life: 'air', garden: 'sprout', shield: 'shield', rover: 'rover' };

export interface UIHooks { sound(name: string): void; speak(text: string, who?: string): void; openMenu(): void; planner(): boolean }

export class UI {
  hud = h('div', { class: 'hud hidden' });
  layer = h('div', {});
  fx = { sparkle: h('canvas', { class: 'sparkle' }) as HTMLCanvasElement, frost: h('div', { class: 'frost' }) };
  private gauges: Record<string, { el: HTMLElement; arc: SVGCircleElement; val: HTMLElement; real: HTMLElement }> = {};
  private solEl = h('div', { class: 'sol glass' });
  private modeEl = h('div', { class: 'badge' });
  private badgeEl = h('span', {});
  private sparkleOn = 0;
  /** Where pop-up cards are attached: the page, or the tablet screen in first person. */
  overlayRoot!: HTMLElement;

  constructor(public root: HTMLElement, public hooks: UIHooks) {
    const wrist = h('div', { class: 'wrist glass', role: 'group', 'aria-label': 'Outpost systems' });
    for (const k of ['air', 'power', 'shield'] as const) {
      const el = h('div', { class: 'gauge', html: `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="5"/><circle class="arc" cx="32" cy="32" r="26" fill="none" stroke="${COLORS[k]}" stroke-width="5" stroke-linecap="round" stroke-dasharray="163.4" stroke-dashoffset="163.4" transform="rotate(-90 32 32)" style="transition:stroke-dashoffset 1s ease"/></svg><div class="val">0</div><div class="lab">${icon(ICONS[k], COLORS[k])} ${NAMES[k].toUpperCase()}</div><div class="real"></div>` });
      this.gauges[k] = { el, arc: el.querySelector('.arc') as SVGCircleElement, val: el.querySelector('.val') as HTMLElement, real: el.querySelector('.real') as HTMLElement };
      wrist.append(el);
    }
    wrist.append(h('div', { class: 'mini' }, this.badgeEl));
    const menuBtn = h('button', { class: 'btn small glass', 'aria-label': 'Pause menu', html: icon('menu'), onclick: () => hooks.openMenu() });
    this.hud.append(h('div', { class: 'topbar' }, h('div', { class: 'row' }, this.solEl, this.modeEl), menuBtn), wrist);
    this.overlayRoot = root;
    root.append(this.fx.frost, this.fx.sparkle, this.hud, this.layer);
    this.sparkLoop();
  }

  // ---------------------------------------------------------------- helpers

  clear() { this.layer.replaceChildren(); }
  private panel(cls: string, ...kids: (Child | Child[])[]) { const p = h('div', { class: `panel glass fade-in ${cls}`, role: 'dialog' }, ...kids); this.layer.replaceChildren(p); queueMicrotask(() => (p.querySelector('button:not([disabled])') as HTMLElement | null)?.focus({ preventScroll: true })); return p; }
  btn(label: string, cls: string, fn: () => void) { return h('button', { class: `btn ${cls}`, onclick: () => { this.hooks.sound('click'); fn(); } }, label); }

  line(l: Line, i = 0): HTMLElement {
    const c = CREW[l.who];
    if (i < 4) setTimeout(() => this.hooks.sound(l.who === 'sam' ? 'message' : 'radio'), i * 280);
    const color = c?.color ?? '#cfd8e0';
    const face = h('div', { class: 'face', style: `color:${color}` }, c ? c.shortName.charAt(0) : '•');
    if (c?.portrait) {
      const img = new Image();
      img.onload = () => { face.replaceChildren(img, h('span', { class: 'si-mark' }, 'SI-generated')); };
      img.src = `${import.meta.env.BASE_URL}${c.portrait}`; img.alt = '';
    }
    return h('div', { class: 'line', style: `animation-delay:${i * 0.28}s` }, face,
      h('div', {}, h('div', { class: 'who', style: `color:${color}` }, c ? c.shortName : 'Mars', c ? h('small', {}, c.role) : null), h('div', { class: 'say' }, l.say)));
  }

  deltas(ch: Record<string, number>): HTMLElement {
    const box = h('div', { class: 'deltas' });
    for (const [k, v] of Object.entries(ch)) {
      if (!NAMES[k] || Math.abs(v) < 0.5) continue;
      const dose = k.startsWith('dose');
      const good = dose || k === 'risk' ? v < 0 : v > 0;
      const txt = dose ? `+${Math.round(v)} µGy` : k === 'power' ? `${v > 0 ? '+' : ''}${(v / 10).toFixed(v % 10 ? 1 : 0)} cell${Math.abs(v) === 10 ? '' : 's'}` : `${v > 0 ? '+' : ''}${Math.round(v)}`;
      box.append(h('span', { class: `delta ${good ? 'up' : 'down'}`, html: `${icon(ICONS[k] ?? 'ring')} ${NAMES[k]} ${txt} ${good ? '▲' : '▼'}` }));
    }
    return box;
  }

  toast(text: string, ms = 2600) { const t = h('div', { class: 'toast glass' }, text); this.root.append(t); setTimeout(() => t.remove(), ms); }

  /** "REAL DATA" chip → card with the real numbers, source and link. Dates stay hidden in the story mission until the reveal. */
  dataChip(m: Mission, ids: string[], extra?: string): HTMLElement {
    return h('button', { class: 'chip', html: `${icon('dish')} Real data`, onclick: () => this.dataCard(m, ids, extra) });
  }
  dataCard(m: Mission, ids: string[], extra?: string) {
    const d = dayOf(m), hidden = m.cfg.windowId === 'may-2024' && !m.cfg.history && !m.s.ended;
    const date = hidden ? 'a real day (revealed when the mission ends)' : tokens(m).realDate;
    const rows: string[] = [];
    if (ids.includes('donki')) {
      rows.push(`<tr><th>Biggest solar flare</th><td>${d.flares.max ?? 'none'} (${d.flares.count} flares that day)</td></tr>`);
      if (d.cmes.fastest) rows.push(`<tr><th>Fastest solar cloud (CME)</th><td>${d.cmes.fastest} km/s</td></tr>`);
      if (d.marsArrivals?.length) rows.push(`<tr><th>Forecast model: clouds reaching Mars</th><td>${d.marsArrivals.length}</td></tr>`);
      if (d.earth.kpMax) rows.push(`<tr><th>Earth storm index (Kp)</th><td>${d.earth.kpMax} out of 9</td></tr>`);
    }
    if (ids.includes('radlab-msl')) {
      const g = d.game;
      rows.push(`<tr><th>Radiation on Mars that day</th><td>${Math.round(g.doseOutside)} µGy ${g.radSource === 'measured' ? '(measured by the Curiosity rover)' : '(estimated: no rover data for this date)'}${g.injectedFrom ? ' — ARCHIVED storm of 20 May 2024' : ''}</td></tr>`);
      if (d.rad?.maxRate) rows.push(`<tr><th>Highest reading</th><td>${d.rad.maxRate} µGy per hour</td></tr>`);
      rows.push(`<tr><th>A calm day</th><td>about ${Math.round(g.doseCalm)} µGy</td></tr>`);
    }
    rows.push(`<tr><th>Radio delay to Earth</th><td>${d.orbit.lightMinutes} minutes one way (${d.orbit.distanceMillionKm} million km)</td></tr>`);
    const src = ids.map((id) => SOURCES[id]).filter(Boolean).map((s) => `<li><b>${s.org}</b> — ${hidden ? s.title : `<a href="${s.url}" target="_blank" rel="noopener">${s.title}</a>`}</li>`).join('');
    const scr = h('div', { class: 'screen fade-in', role: 'dialog' }, h('div', { class: 'wrap' },
      h('div', { class: 'eyebrow', html: `${icon('dish')} Real data — not invented` }), h('h1', {}, 'What really happened'),
      h('p', {}, `Sol ${m.s.sol} of this mission is ${date}.`), extra ? h('p', {}, extra) : null,
      h('table', { class: 'data', html: rows.join('') }), h('h3', {}, 'Sources'), h('ul', { html: src }),
      h('p', { style: 'color:var(--ui-dim);font-size:.85em' }, m.cfg.live ? 'Mode: LIVE space weather.' : 'Mode: ARCHIVED real data (a saved snapshot, not live).'),
      h('div', { class: 'actions' }, this.btn('Close', 'primary', () => scr.remove()))));
    this.overlayRoot.append(scr); (scr.querySelector('button') as HTMLElement).focus();
  }

  // ---------------------------------------------------------------- HUD

  showHud(on: boolean) { this.hud.classList.toggle('hidden', !on); }
  updateHud(m: Mission) {
    const s = m.s, planner = this.hooks.planner();
    const real: Record<string, string> = { air: `${(s.air * BAL.units.airPointKgO2).toFixed(1)} kg O₂`, power: `${Math.round(s.power * BAL.cell.kWh / BAL.cell.points)} kWh`, shield: `${Math.round(s.shield)} %` };
    for (const k of ['air', 'power', 'shield'] as const) {
      const g = this.gauges[k], v = (s as any)[k] as number;
      g.arc.style.strokeDashoffset = String(163.4 * (1 - v / 100)); g.val.textContent = String(Math.round(v));
      g.el.classList.toggle('warn', k !== 'shield' && v < BAL.ui.warnAt && v >= BAL.ui.dangerAt); g.el.classList.toggle('danger', k !== 'shield' && v < BAL.ui.dangerAt);
      g.real.textContent = planner ? real[k] : '';
    }
    const days = m.cfg.days;
    this.solEl.innerHTML = `SOL <b>${s.sol}</b> / ${BAL.missionSols}<div class="pips">${days.map((d: any, i: number) => `<i class="${i < s.sol ? 'on' : ''} ${i < s.sol - 1 && d.game.stormLevel >= 2 ? 'storm' : ''}"></i>`).join('')}</div>`;
    this.modeEl.className = `badge ${m.cfg.live ? 'live' : ''}`;
    this.modeEl.innerHTML = `<span class="dot"></span>${m.cfg.live ? 'Live space weather' : 'Real data · archived'}`;
    const lim = m.diff.dose, pct = Math.min(100, Math.round((Math.max(s.dose, s.doseDil) / lim.red) * 100));
    this.badgeEl.innerHTML = `${icon('badge', pct >= 100 * lim.amber / lim.red ? 'var(--ui-warn)' : 'var(--ui-ok)')} Radiation badge ${pct}%${planner ? ` · ${Math.round(s.dose)} µGy` : ''}`;
    this.fx.frost.style.opacity = s.flags.coldNight ? '1' : '0';
  }

  // ---------------------------------------------------------------- dawn

  dawn(m: Mission, r: DawnReport): Promise<void> {
    return new Promise((done) => {
      const items: HTMLElement[] = [];
      for (const l of r.landed) items.push(h('li', { class: 'because' }, l.because ?? 'Something you set in motion has arrived.', this.deltas(l.changes)));
      for (const n of r.notes) items.push(h('li', {}, n));
      const msgs = r.messages.flatMap((msg) => msg.map((l, i) => this.line(l, i)));
      const cells = Math.floor(r.available / BAL.cell.points);
      this.panel('right',
        h('div', { class: 'eyebrow' }, `Dawn · Sol ${r.sol} of ${BAL.missionSols}`),
        h('h2', { html: `${icon('sun')} Morning report` }),
        msgs.length ? h('div', {}, h('div', { class: 'eyebrow', style: 'margin-top:12px', html: `${icon('earth')} Message from Earth · sent ${tokens(m).delayMin} minutes ago` }), msgs) : null,
        h('ul', { class: 'notes' }, items),
        h('div', { class: 'row', style: 'margin-top:12px' }, this.dataChip(m, ['donki', 'radlab-msl']), h('span', { class: 'delta', html: `${icon('power', 'var(--ui-power)')} ${cells} power cells to share today` })),
        h('div', { class: 'actions' }, this.btn('Open the power board', 'primary', () => done())));
      this.hooks.speak([...r.landed.map((l) => l.because), ...r.notes].filter(Boolean).join(' '), 'pip');
    });
  }

  // ---------------------------------------------------------------- power board

  board(m: Mission, opts: { tutorial: boolean; onChange?: (a: Alloc) => void }): Promise<Alloc> {
    return new Promise((done) => {
      const a: Alloc = { ...m.s.alloc };
      for (let g = 0; g < 12 && !canAfford(m, a); g++) { const k = (['rover', 'shield', 'garden', 'life'] as SystemId[]).find((x) => a[x] > 0); if (!k) break; a[k]--; }
      const avail = available(m);
      const rows: Record<string, { lvl: HTMLElement; eff: HTMLElement; minus: HTMLButtonElement; plus: HTMLButtonElement }> = {};
      const cellsEl = h('span', { class: 'cells' }), battEl = h('span', {}), hintEl = h('div', { class: 'hint' }), statusEl = h('div', { class: 'deltas' });
      const render = () => {
        const cost = allocCost(a), p = preview(m, a), total = Math.floor(avail / 10), used = cost / 10;
        cellsEl.innerHTML = Array.from({ length: Math.max(total, used) }, (_, i) => `<i class="${i < total - used ? 'on' : 'spent'}"></i>`).join('');
        const after = Math.max(0, Math.min(100, m.s.power + p.power));
        battEl.innerHTML = `Battery tonight: <b>${(after / 10).toFixed(0)}</b> cells${after < 10 ? ' ⚠' : ''}`;
        for (const k of BAL.systems.order as SystemId[]) {
          const r = rows[k]; const L = a[k];
          r.lvl.innerHTML = `<div class="bars">${[1, 2, 3].map((i) => `<i class="${i <= L ? 'on' : ''}"></i>`).join('')}</div>${LEVELS[L]}`;
          r.minus.disabled = L <= 0; r.plus.disabled = L >= 3 || !canAfford(m, { ...a, [k]: L + 1 });
          const eff: Record<string, number> = k === 'life' ? { air: p.air } : k === 'garden' ? { plants: p.plants, water: p.water } : k === 'shield' ? { shield: p.shield } : { science: p.science };
          r.eff.replaceChildren(...Array.from(this.deltas(eff).children));
          if (!r.eff.children.length) r.eff.append(h('span', { class: 'delta' }, k === 'rover' && m.s.science >= 100 ? 'Core sealed' : 'No change tonight'));
        }
        const s = m.s, H = DLG.hints; let hint = '';
        if (m.diff.hints || opts.tutorial) {
          if (s.air + p.air < 30) hint = H['alloc.lowAir']; else if (after < 10 && m.s.sol >= m.dust.start - 1) hint = H['alloc.lowPower']; else if (!s.flags.plantsDead && s.plants + p.plants < 12) hint = H['alloc.plantsWilting']; else if (s.shield + p.shield < 40 && s.sol >= 5 && s.sol <= 7) hint = H['alloc.stormWatch'];
        }
        hintEl.innerHTML = hint ? `${icon('ring', 'var(--ui-air)')} ${hint}` : '';
        opts.onChange?.(a);
      };
      const sysRows = (BAL.systems.order as SystemId[]).map((k) => {
        const lvl = h('div', { class: 'lvl', style: `color:${SYS_COLOR[k]}` }), eff = h('div', { class: 'eff' });
        const minus = h('button', { 'aria-label': `Less power for ${BAL.systems[k].name}`, onclick: () => { if (a[k] > 0) { a[k]--; this.hooks.sound('down'); render(); } } }, '−');
        const plus = h('button', { 'aria-label': `More power for ${BAL.systems[k].name}`, onclick: () => { if (a[k] < 3 && canAfford(m, { ...a, [k]: a[k] + 1 })) { a[k]++; this.hooks.sound('up'); render(); } else { this.hooks.sound('deny'); this.toast(DLG.hints['alloc.overspend']); } } }, '+');
        rows[k] = { lvl, eff, minus, plus };
        return h('div', { class: 'sys' }, h('div', { class: 'name', html: `${icon(SYS_ICON[k], SYS_COLOR[k])} ${BAL.systems[k].name}` }), h('div', { class: 'step' }, minus, lvl, plus), eff);
      });
      const s = m.s;
      statusEl.innerHTML = [`${icon('sprout', 'var(--ui-food)')} Garden ${s.flags.plantsDead ? 'lost' : Math.round(s.plants) + '%'}`, `${icon('core')} Core ${Math.round(s.science)}%`, `${icon('food', 'var(--ui-food)')} Food ${Math.round(s.food)}`, `${icon('water', 'var(--ui-water)')} Water ${Math.round(s.water)}`].map((x) => `<span class="delta">${x}</span>`).join('');
      const tut = opts.tutorial ? h('div', {}, (DLG.tutorial as any[]).slice(1, 5).map((l, i) => this.line(l, i))) : null;
      const plan = m.diff.hints ? this.btn("PIP's plan", 'small ghost', () => { Object.assign(a, { life: 2, garden: 2, shield: 1, rover: 2 }); for (let g = 0; g < 12 && !canAfford(m, a); g++) { const k = (['shield', 'rover', 'garden', 'life'] as SystemId[]).find((x) => a[x] > 1) ?? (['shield', 'rover', 'garden', 'life'] as SystemId[]).find((x) => a[x] > 0); if (!k) break; a[k]--; } render(); }) : null;
      this.panel('right board',
        h('div', { class: 'eyebrow' }, `Sol ${s.sol} · Power board`),
        h('h2', { html: `${icon('power', 'var(--ui-power)')} Share out the power` }),
        tut,
        h('div', { class: 'avail' }, h('span', {}, 'Today: ', cellsEl), battEl),
        statusEl, sysRows, hintEl,
        h('div', { class: 'actions' }, plan, this.btn('Confirm', 'primary', () => done({ ...a }))));
      render();
    });
  }

  // ---------------------------------------------------------------- events

  private choiceButtons(m: Mission, holder: any, pick: (id: string) => void): HTMLElement {
    const t = tokens(m);
    return h('div', { class: 'choices' }, holder.choices.map((c: any, i: number) => {
      const st = choiceState(m, c);
      return h('button', { class: 'choice', disabled: !st.ok, 'data-key': String(i + 1), onclick: () => { this.hooks.sound('choose'); pick(c.id); } },
        h('span', { class: 'n' }, String(i + 1)),
        h('span', {}, h('b', {}, fill(c.label, t), c.askEarth ? h('span', { html: ' ' + icon('earth', 'var(--ui-air)') }) : null), h('small', { class: st.ok ? '' : 'why' }, st.ok ? fill(c.detail ?? '', t) : st.why ?? '')));
    }));
  }

  private async result(m: Mission, title: string, res: ChoiceResult, learn?: string, sources?: string[]): Promise<void> {
    return new Promise((done) => {
      this.panel('right',
        h('div', { class: 'eyebrow' }, title),
        res.lines.map((l, i) => this.line(l, i)),
        this.deltas(res.changes),
        learn ? h('div', { class: 'learn' }, h('div', { class: 't', html: `${icon('book', 'var(--ui-air)')} Real science` }), learn, sources?.length ? h('div', { style: 'margin-top:8px' }, this.dataChip(m, sources.filter((x) => SOURCES[x]))) : null) : null,
        h('div', { class: 'actions' }, this.btn('Continue', 'primary', () => done())));
      this.hooks.speak(res.lines.map((l) => l.say).join(' ') + (learn ? ' ' + learn : ''));
    });
  }

  /** A normal event or a note. `apply` runs the simulation for the chosen option. */
  event(m: Mission, ev: EventInst, apply: (choiceId: string) => ChoiceResult): Promise<void> {
    return new Promise((done) => {
      const title = `Sol ${m.s.sol} · ${ev.def.title}`;
      if (ev.note) { this.panel('right', h('div', { class: 'eyebrow' }, title), ev.lines.map((l, i) => this.line(l, i)), h('div', { class: 'actions' }, this.btn('Continue', 'primary', () => done()))); this.hooks.speak(ev.lines.map((l) => l.say).join(' ')); return; }
      const hint = m.diff.hints ? ev.def.choices.find((c: any) => c.hint)?.hint : null;
      this.panel('right',
        h('div', { class: 'eyebrow' }, title),
        ev.lines.map((l, i) => this.line(l, i)),
        ev.def.realData?.length ? h('div', { style: 'margin-top:12px' }, this.dataChip(m, ev.def.realData)) : null,
        hint ? h('div', { class: 'hint', html: `${icon('ring', 'var(--ui-air)')} ${fill(hint, tokens(m))}` }) : null,
        this.choiceButtons(m, ev.def, async (id) => { const res = apply(id); await this.result(m, title, res, ev.learn, ev.def.sources); done(); }));
      this.hooks.speak(ev.lines.map((l) => l.say).join(' '));
    });
  }

  /** One step of the storm. Resolves with the chosen id (or the default when the clock runs out on Commander). */
  crisisStep(m: Mission, ev: EventInst, step: any, intro: Line[] | null, extra: HTMLElement | null): Promise<string> {
    return new Promise((done) => {
      let over = false; const finish = (id: string) => { if (over) return; over = true; done(id); };
      const bar = h('i', {});
      const timed = m.diff.timers;
      const t = tokens(m);
      this.panel('right',
        h('div', { class: 'eyebrow', style: 'color:var(--ui-danger)', html: `${icon('warn', 'var(--ui-danger)')} Solar storm · ${step.title}` }),
        intro ? intro.map((l, i) => this.line(l, i)) : null,
        (step.lines as Line[]).map((l, i) => this.line({ ...l, say: fill(l.say, t) }, i + (intro?.length ?? 0))),
        extra,
        h('div', { class: 'row', style: 'margin-top:10px' }, this.dataChip(m, ['radlab-msl', 'donki']), h('span', { class: 'delta', html: `${icon('shield', 'var(--ui-shield)')} Shield ${Math.round(m.s.shield)}% · needs ${shieldNeed(m)}%` })),
        timed ? h('div', { class: 'clock', title: 'Time left to decide' }, bar) : null,
        this.choiceButtons(m, step, finish));
      this.hooks.speak([...(intro ?? []), ...step.lines].map((l: Line) => l.say).join(' '));
      if (timed) {
        const secs = BAL.storm.stepSeconds + (intro ? 12 : 0);
        bar.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: secs * 1000, fill: 'forwards' }).onfinish = () => finish(step.defaultChoice);
      }
    });
  }
  crisisResult(m: Mission, step: any, res: ChoiceResult): Promise<void> { return this.result(m, `Solar storm · ${step.title}`, res, step.learn ? fill(step.learn, tokens(m)) : undefined, ['jpl-may2024-storm']); }

  // ---------------------------------------------------------------- night

  night(m: Mission, r: NightReport, dayData: any): Promise<void> {
    return new Promise((done) => {
      const st = r.storm;
      const stormBox = st ? h('div', { class: 'learn', style: 'border-color:rgba(183,156,255,.5);background:rgba(183,156,255,.1)' },
        h('div', { class: 't', style: 'color:var(--ui-shield)', html: `${icon('shield', 'var(--ui-shield)')} Solar storm · level ${st.level} of 3` }),
        h('div', {}, `Shelter protection: ${Math.round(st.protection * 100)}%. Outside, the day's radiation was ${Math.round(st.doseOutside)} µGy${st.measured ? ', as measured on Mars by the Curiosity rover' : ' (estimated)'}. A calm day is about ${Math.round(dayData.game.doseCalm)}.`),
        st.peakRate ? h('div', {}, `Highest reading: ${st.peakRate} µGy per hour at ${st.peakTime?.slice(11, 16)} UTC.`) : null,
        h('div', { style: 'margin-top:8px' }, this.dataChip(m, ['radlab-msl', 'donki']))) : null;
      this.panel('center',
        h('div', { class: 'eyebrow' }, `Night · Sol ${r.sol}`),
        h('h2', {}, r.ended ? 'The last night' : 'What your choices did'),
        this.deltas(r.changes),
        stormBox,
        r.because.length ? h('ul', { class: 'notes' }, r.because.map((b) => h('li', { class: 'because' }, b))) : null,
        r.lines.map((l, i) => this.line(l, i)),
        r.harvest ? h('ul', { class: 'notes' }, h('li', { class: 'good' }, 'The garden is ready to harvest. Food on Mars.')) : null,
        h('div', { class: 'actions' }, this.btn(r.ended ? 'See how it ends' : `Sleep until Sol ${r.sol + 1}`, 'primary', () => done())));
      this.hooks.speak([...r.because, ...r.lines.map((l) => l.say)].join(' '));
    });
  }

  // ---------------------------------------------------------------- cinematic captions

  /** Letterboxed caption lines over the 3D scene; skippable. */
  cinematic(lines: string[], secondsEach = 4.2): Promise<void> {
    return new Promise((done) => {
      document.body.classList.add('letterbox');
      const cap = h('div', { class: 'caption' });
      let i = 0, timer = 0, over = false;
      const end = () => { if (over) return; over = true; clearTimeout(timer); document.body.classList.remove('letterbox'); this.clear(); done(); };
      const next = () => { if (i >= lines.length) return end(); cap.textContent = lines[i]; cap.classList.remove('fade-in'); void cap.offsetWidth; cap.classList.add('fade-in'); this.hooks.speak(lines[i], 'narrator'); i++; timer = window.setTimeout(next, secondsEach * 1000); };
      this.layer.replaceChildren(cap, h('button', { class: 'btn small ghost skip', onclick: end }, 'Skip ', h('span', { class: 'kbd' }, 'Esc')));
      next();
    });
  }

  // ---------------------------------------------------------------- radiation sparkle (camera "snow", a real effect)

  setSparkle(v: number) { this.sparkleOn = v; this.fx.sparkle.style.opacity = v > 0.01 ? '1' : '0'; }
  private sparkLoop() {
    const cv = this.fx.sparkle, cx = cv.getContext('2d')!;
    const tick = () => {
      requestAnimationFrame(tick);
      if (this.sparkleOn <= 0.01) return;
      if (cv.width !== innerWidth) { cv.width = innerWidth; cv.height = innerHeight; }
      cx.clearRect(0, 0, cv.width, cv.height);
      const n = Math.floor(this.sparkleOn * 46);
      cx.strokeStyle = 'rgba(255,255,255,.85)'; cx.fillStyle = 'rgba(255,255,255,.9)';
      for (let i = 0; i < n; i++) {
        const x = Math.random() * cv.width, y = Math.random() * cv.height;
        if (Math.random() < 0.35) { const a = Math.random() * 6.28, l = 6 + Math.random() * 26; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); cx.stroke(); }
        else cx.fillRect(x, y, 1.5, 1.5);
      }
    };
    tick();
  }
}
