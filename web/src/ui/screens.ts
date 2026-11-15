// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
/**
 * screens.ts — full-screen views: title, difficulty, debrief, ending gallery, Science Log / credits, settings.
 */
import gameJson from '@shared/design/game.json';
import achievementsJson from '@shared/design/achievements.json';
import windowsJson from '@shared/design/windows.json';
import scienceLog from '@shared/science-log.md?raw';
import { BAL, ENDINGS, derived, test, difficulty, type Mission, type DifficultyId } from '../sim/engine';
import { missionCode } from '../sim/rng';
import { h, icon, SOURCES, GLOSSARY, type UI } from './ui';
import { store } from '../store';

export const GAME: any = gameJson;
export const ACH: any[] = (achievementsJson as any).achievements;
const WIN: any[] = (windowsJson as any).windows;

export interface TitleActions { start(d: DifficultyId): void; live(d: DifficultyId): void; history(id: string, d: DifficultyId): void; code(code: string, d: DifficultyId): void }
export interface LiveBadge { mode: 'live' | 'archived' | 'loading'; text: string; detail: string }

function mdToHtml(md: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const inline = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>').replace(/\[(.+?)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const out: string[] = []; let list = false, table = false;
  for (const raw of md.split(/\r?\n/)) {
    const l = raw.trimEnd();
    if (/^\|/.test(l)) { if (/^\|[\s:-]+\|/.test(l.replace(/[^|:\-\s]/g, '')) && /^[|\s:-]+$/.test(l)) continue; if (!table) { out.push('<table class="data">'); table = true; } out.push('<tr>' + l.slice(1, -1).split('|').map((c) => `<td>${inline(c.trim())}</td>`).join('') + '</tr>'); continue; }
    if (table) { out.push('</table>'); table = false; }
    if (/^[-*] /.test(l)) { if (!list) { out.push('<ul>'); list = true; } out.push(`<li>${inline(l.slice(2))}</li>`); continue; }
    if (list) { out.push('</ul>'); list = false; }
    if (/^### /.test(l)) out.push(`<h3>${inline(l.slice(4))}</h3>`); else if (/^## /.test(l)) out.push(`<h3>${inline(l.slice(3))}</h3>`); else if (/^# /.test(l)) out.push(`<h1>${inline(l.slice(2))}</h1>`); else if (/^> /.test(l)) out.push(`<p style="color:var(--ui-dim)">${inline(l.slice(2))}</p>`); else if (l.trim()) out.push(`<p>${inline(l)}</p>`);
  }
  if (list) out.push('</ul>'); if (table) out.push('</table>');
  return out.join('');
}

export class Screens {
  constructor(private ui: UI, private apply: () => void) {}
  private open(...kids: any[]) { const scr = h('div', { class: 'screen fade-in', role: 'dialog' }, h('div', { class: 'wrap' }, ...kids)); this.ui.root.append(scr); queueMicrotask(() => (scr.querySelector('button') as HTMLElement | null)?.focus()); return scr; }
  private b(label: string, cls: string, fn: () => void) { return this.ui.btn(label, cls, fn); }

  // ------------------------------------------------------------ title

  title(actions: TitleActions, badge: () => LiveBadge) {
    const badgeEl = h('div', { class: 'badge' });
    const paint = () => { const b = badge(); badgeEl.className = `badge ${b.mode === 'live' ? 'live' : b.mode === 'archived' ? 'warn' : ''}`; badgeEl.innerHTML = `<span class="dot"></span>${b.text}`; badgeEl.title = b.detail; detail.textContent = b.detail; };
    const detail = h('span', {});
    const pickDiff = (go: (d: DifficultyId) => void) => {
      const scr = this.open(h('div', { class: 'eyebrow' }, 'Choose your seat'), h('h1', {}, 'Who is in command?'),
        h('div', { class: 'grid', style: 'margin-top:18px' }, (['cadet', 'commander', 'classroom'] as DifficultyId[]).map((id) => { const d = difficulty(id); return h('button', { class: 'card choice', style: 'grid-template-columns:1fr', onclick: () => { scr.remove(); go(id); } }, h('span', {}, h('b', {}, `${d.name}`), h('small', {}, `Ages ${d.ages}. ${d.blurb}`))); })),
        h('div', { class: 'actions' }, this.b('Back', 'ghost', () => scr.remove())));
    };
    const historyMenu = () => {
      const scr = this.open(h('div', { class: 'eyebrow' }, 'Replay history · real archived NASA data'), h('h1', {}, 'Storms that really happened'),
        h('p', {}, 'Fly the same outpost through other real solar storms. Radiation on the ground is what NASA\'s Curiosity rover measured on those days.'),
        h('div', { class: 'grid', style: 'margin-top:14px' }, WIN.filter((w) => w.role === 'history' || (w.role === 'story' && store.data.missions > 0)).map((w) => h('button', { class: 'card choice', style: 'grid-template-columns:1fr', onclick: () => { scr.remove(); pickDiff((d) => actions.history(w.id, d)); } }, h('span', {}, h('b', {}, w.role === 'story' ? 'May 2024' : w.menuTitle), h('small', {}, w.role === 'story' ? 'Mission One again, with the dates shown.' : w.menuBlurb))))),
        h('h3', {}, 'Have a mission code?'),
        h('div', { class: 'row' }, h('input', { id: 'codein', class: 'btn', style: 'text-transform:uppercase;min-width:240px;cursor:text', placeholder: 'MAY-2024-1A2B3C', 'aria-label': 'Mission code', maxlength: '32' }), this.b('Fly this code', '', () => { const v = (scr.querySelector('#codein') as HTMLInputElement).value.trim(); if (v) { scr.remove(); pickDiff((d) => actions.code(v, d)); } })),
        h('div', { class: 'actions' }, this.b('Back', 'ghost', () => scr.remove())));
    };
    const desktop = GAME.links.desktopDownload ? h('a', { class: 'btn ghost small', href: GAME.links.desktopDownload, target: '_blank', rel: 'noopener' }, 'Get the Desktop Ultra Edition (Windows)') : h('span', { class: 'btn ghost small', style: 'opacity:.55;cursor:default', title: 'The download link appears here when the build is released' }, 'Desktop Ultra Edition · coming soon');
    const el = h('div', { class: 'title fade-in' },
      h('div', { class: 'top' }, h('div', { class: 'sub' }, `${GAME.teamCredit} · ${GAME.event}`), badgeEl),
      h('div', { class: 'sub' }, GAME.subtitle),
      h('div', { class: 'wordmark' }, GAME.title),
      h('div', { class: 'tag' }, GAME.tagline),
      h('div', { class: 'menu' },
        this.b('Start mission', 'primary', () => pickDiff(actions.start)),
        this.b("Play today's real sky", '', () => pickDiff(actions.live)),
        this.b('Replay history', '', historyMenu),
        this.b('Endings', 'ghost', () => this.gallery()),
        this.b('Science log', 'ghost', () => this.scienceLog()),
        this.b('Settings', 'ghost', () => this.settings()),
        desktop),
      h('div', { class: 'foot' }, h('span', {}, 'This is the real terrain of Jezero Crater, from NASA Mars Reconnaissance Orbiter (CTX) data.'), detail, h('span', {}, GAME.disclaimers.noEndorsement)));
    this.ui.layer.replaceChildren(el);
    paint();
    const iv = setInterval(() => (el.isConnected ? paint() : clearInterval(iv)), 1500);
    queueMicrotask(() => (el.querySelector('button') as HTMLElement).focus());
  }

  // ------------------------------------------------------------ debrief

  debrief(m: Mission, endingId: string, earned: string[], actions: { again(): void; title(): void }) {
    const e = ENDINGS.find((x) => x.id === endingId)!, s = m.s, d = derived(m);
    const x = BAL.radiation.xrayEquivalentMicroGray;
    const code = missionCode(m.cfg.windowId, m.cfg.seed);
    const chart = h('canvas', { class: 'chart', width: '960', height: '260', role: 'img', 'aria-label': 'Chart of air, power, shield and radiation over the mission' }) as HTMLCanvasElement;
    const scr = this.open(
      h('div', { class: 'eyebrow' }, `Mission debrief · ${m.diff.name} · code ${code}`),
      h('h1', {}, e.title), h('p', { style: 'font-size:1.15em' }, e.oneLine),
      h('div', { class: 'learn' }, h('div', { class: 't', html: `${icon('book', 'var(--ui-air)')} The real science behind your ending · ${e.science.title}` }), e.science.text,
        h('div', { style: 'margin-top:8px;font-size:.85em', html: 'Sources: ' + e.science.sources.map((id: string) => SOURCES[id]).filter(Boolean).map((sx: any) => `<a href="${sx.url}" target="_blank" rel="noopener">${sx.org}: ${sx.title}</a>`).join(' · ') })),
      h('h3', {}, 'One tip for next time'), h('p', {}, e.whatIf),
      h('h3', {}, 'Your mission in numbers'),
      h('div', { class: 'grid' },
        ...[['Air', `${Math.round(s.air)}%`, `${(s.air * BAL.units.airPointKgO2).toFixed(1)} kg of oxygen in reserve`], ['Power', `${Math.round(s.power / 10)} cells`, `${Math.round(s.power)} kWh in the battery`], ['Shield', `${Math.round(s.shield)}%`, s.flags.shieldFailed ? 'It ran dry during the storm' : 'It never failed'],
          ['Garden', s.flags.plantsDead ? 'Lost' : `${Math.round(s.plants)}%`, `${s.harvests} harvest${s.harvests === 1 ? '' : 's'}`], ['Leopard Core', s.flags.sampleSecured ? 'Aboard' : `${Math.round(s.science)}%`, s.flags.sampleSecured ? 'On its way to Earth' : 'Still on Mars'],
          ['Crew radiation badge', `${Math.round(s.dose)} µGy`, `about ${(s.dose / x).toFixed(1)} chest X-rays (NASA/JPL comparison)`], ["Dil's badge", `${Math.round(s.doseDil)} µGy`, s.flags.dilGrounded ? 'Over the mission limit' : 'Under the mission limit'], ['Gambles taken', String(s.risk), d.highRisk ? 'A risky mission' : 'A careful mission'], ['Message from Earth', `${Math.min(3, s.fragments)} of 3 pieces`, d.decoded ? 'Decoded' : 'Still broken'],
        ].map(([t, v, sub]) => h('div', { class: 'card' }, h('div', { class: 't' }, t), h('div', { class: 'd', style: 'font-size:1.5em' }, v), h('small', {}, sub)))),
      h('h3', {}, 'How your systems changed (dashed line = real radiation outside)'), chart,
      h('h3', {}, 'Turning points'),
      h('ul', { class: 'timeline' }, s.log.length ? s.log.map((l) => h('li', { class: l.kind }, h('b', {}, `SOL ${l.sol}`), h('span', {}, l.text.replace(/^Sol \d+: /, '')))) : h('li', {}, h('b', {}, '—'), h('span', {}, 'A quiet mission.'))),
      earned.length ? h('h3', {}, 'New badges') : null,
      earned.length ? h('div', { class: 'grid' }, earned.map((id) => { const a = ACH.find((q) => q.id === id)!; return h('div', { class: 'card' }, h('div', { class: 't' }, a.title), h('small', {}, a.text)); })) : null,
      h('p', { style: 'color:var(--ui-dim);font-size:.85em;margin-top:18px' }, `Mission code ${code}: a friend who enters it flies the same dust and the same breakdowns. The code holds no personal data. Dose limits in the game are scaled to a 10-sol mission; real astronaut limits are far higher.`),
      h('div', { class: 'actions' }, this.b('Endings', 'ghost', () => this.gallery()), this.b('Science log', 'ghost', () => this.scienceLog()), this.b('Copy mission code', 'ghost', () => { navigator.clipboard?.writeText(code).then(() => this.ui.toast('Mission code copied'), () => this.ui.toast(code)); }), this.b('Title', '', () => { scr.remove(); actions.title(); }), this.b('Fly again', 'primary', () => { scr.remove(); actions.again(); })));
    // chart
    const cx = chart.getContext('2d')!, W = chart.width, H = chart.height, hist = s.history, n = Math.max(2, hist.length);
    const X = (i: number) => 40 + (i / (BAL.missionSols - 1)) * (W - 60), Y = (v: number) => H - 28 - (v / 100) * (H - 48);
    cx.font = '12px Oxanium, sans-serif'; cx.fillStyle = 'rgba(255,255,255,.55)'; cx.strokeStyle = 'rgba(255,255,255,.1)';
    for (let i = 0; i < BAL.missionSols; i++) { cx.fillText(`S${i + 1}`, X(i) - 8, H - 8); cx.beginPath(); cx.moveTo(X(i), 14); cx.lineTo(X(i), H - 26); cx.stroke(); }
    const maxDose = Math.max(...hist.map((p) => p.doseOutside), 1);
    cx.setLineDash([5, 5]); cx.strokeStyle = '#ffb05c'; cx.lineWidth = 2; cx.beginPath(); hist.forEach((p, i) => (i ? cx.lineTo(X(i), Y((p.doseOutside / maxDose) * 100)) : cx.moveTo(X(i), Y((p.doseOutside / maxDose) * 100)))); cx.stroke(); cx.setLineDash([]);
    for (const [k, col] of [['air', '#5cc8f0'], ['power', '#f2c744'], ['shield', '#b79cff'], ['plants', '#3cc79a']] as const) { cx.strokeStyle = col; cx.lineWidth = 2.5; cx.beginPath(); hist.forEach((p, i) => (i ? cx.lineTo(X(i), Y((p as any)[k])) : cx.moveTo(X(i), Y((p as any)[k])))); cx.stroke(); cx.fillStyle = col; cx.fillText(k.toUpperCase(), X(n - 1) - 46, Y((hist[n - 1] as any)?.[k] ?? 0) - 6); }
  }

  // ------------------------------------------------------------ gallery, log, settings

  gallery() {
    const seen = store.data.endings;
    const scr = this.open(h('div', { class: 'eyebrow' }, `${Object.keys(seen).length} of ${ENDINGS.length} found`), h('h1', {}, 'Every road home'),
      h('div', { class: 'grid', style: 'margin-top:16px' }, ENDINGS.map((e) => seen[e.id]
        ? h('div', { class: 'card' }, h('div', { class: 't' }, e.title), h('small', {}, e.oneLine))
        : h('div', { class: 'card locked' }, h('div', { class: 't' }, e.secret ? '? ? ?' : 'Locked'), h('small', {}, e.lockedHint)))),
      h('h3', {}, `Badges · ${Object.keys(store.data.achievements).length} of ${ACH.length}`),
      h('div', { class: 'grid' }, ACH.map((a) => h('div', { class: `card ${store.data.achievements[a.id] ? '' : 'locked'}` }, h('div', { class: 't' }, a.title), h('small', {}, a.text)))),
      h('div', { class: 'actions' }, this.b('Close', 'primary', () => scr.remove())));
  }

  scienceLog() {
    const groups: [string, string][] = [['data', 'NASA data that drives the game'], ['partner', 'Space agency partner resources'], ['fact', 'Facts we checked'], ['asset', 'Models, code libraries and fonts'], ['si', 'SI tools']];
    const refs = groups.map(([k, t]) => `<h3>${t}</h3><ul>` + Object.values(SOURCES).filter((s: any) => s.kind === k).map((s: any) => `<li><b>${s.org}</b> — <a href="${s.url}" target="_blank" rel="noopener">${s.title}</a><br><small style="color:var(--ui-dim)">${s.use}</small></li>`).join('') + '</ul>').join('');
    const scr = this.open(h('div', { class: 'eyebrow' }, 'Mission science log · credits and data'),
      h('div', { html: mdToHtml(scienceLog) }),
      h('h1', { style: 'margin-top:30px' }, 'Words to know'),
      h('div', { class: 'grid' }, GLOSSARY.map((g) => h('div', { class: 'card' }, h('div', { class: 't' }, g.word), h('small', {}, g.say)))),
      h('h1', { style: 'margin-top:30px' }, 'References'), h('div', { html: refs }),
      h('p', { style: 'color:var(--ui-dim);font-size:.85em' }, `${GAME.disclaimers.si} ${GAME.disclaimers.noEndorsement}`),
      h('div', { class: 'actions' }, this.b('Close', 'primary', () => scr.remove())));
  }

  settings(extra?: HTMLElement) {
    const st = store.data.settings;
    const seg = (key: keyof typeof st, opts: [any, string][]) => { const box = h('div', { class: 'seg', role: 'group' }); const paint = () => box.replaceChildren(...opts.map(([v, label]) => h('button', { class: (st as any)[key] === v ? 'on' : '', 'aria-pressed': String((st as any)[key] === v), onclick: () => { (st as any)[key] = v; store.save(); this.apply(); paint(); } }, label))); paint(); return box; };
    const row = (label: string, help: string, control: HTMLElement) => h('div', { class: 'setting' }, h('div', {}, h('div', { class: 'd', style: 'letter-spacing:.08em' }, label), h('small', { style: 'color:var(--ui-dim)' }, help)), control);
    const scr = this.open(h('div', { class: 'eyebrow' }, 'Settings'), h('h1', {}, 'Make it yours'),
      row('Picture quality', 'Ultra and High render at your screen\'s full sharpness. A change of quality reloads the game.', seg('quality', [['auto', 'Auto'], ['low', 'Low'], ['high', 'High'], ['ultra', 'Ultra']])),
      row('Sound', 'Wind, machines, alarms and music are generated by code.', seg('volume', [[0, 'Off'], [0.35, 'Low'], [0.7, 'Medium'], [1, 'High']])),
      row('Read aloud', 'A computer voice reads the text. No recorded voices are used.', seg('readAloud', [[false, 'Off'], [true, 'On']])),
      row('Text size', 'Bigger words for smaller readers.', seg('textSize', [[1, '100%'], [1.2, '120%'], [1.4, '140%']])),
      row('Reduced motion', 'Calmer camera, no particles on the interface.', seg('reducedMotion', [[false, 'Off'], [true, 'On']])),
      row('Colour-blind patterns', 'Adds patterns and underlines so colour is never the only signal.', seg('colorBlind', [[false, 'Off'], [true, 'On']])),
      row('Mission Planner view', 'Shows real units: kilowatt-hours, kilograms of oxygen, micrograys.', seg('planner', [[false, 'Off'], [true, 'On']])),
      extra ?? null,
      h('div', { class: 'actions' }, this.b('Done', 'primary', () => { scr.remove(); if (st.quality !== (this as any).q0) location.reload(); })));
    (this as any).q0 = st.quality;
  }

  pause(m: Mission | null, actions: { quit(): void; photo(): void }) {
    const scr = this.open(h('div', { class: 'eyebrow' }, 'Paused'), h('h1', {}, GAME.title),
      m ? h('p', {}, `Sol ${m.s.sol} of ${BAL.missionSols} · ${m.diff.name} · mission code ${missionCode(m.cfg.windowId, m.cfg.seed)}`) : null,
      h('div', { class: 'choices', style: 'max-width:420px' },
        this.b('Resume', 'primary', () => scr.remove()), this.b('Photo mode', '', () => { scr.remove(); actions.photo(); }), this.b('Settings', '', () => this.settings()), this.b('Science log', '', () => this.scienceLog()), this.b('Endings', '', () => this.gallery()),
        m ? this.b('Quit to title', 'ghost', () => { scr.remove(); actions.quit(); }) : null));
    return scr;
  }
}

/** Which badges did this mission earn? (conditions: shared/design/achievements.json) */
export function earnAchievements(m: Mission): string[] {
  const out: string[] = [];
  for (const a of ACH) {
    if (store.data.achievements[a.id]) continue;
    const ok = a.meta ? Object.keys(store.data.endings).length >= ENDINGS.length : test(m, a.when);
    if (ok) { store.data.achievements[a.id] = true; out.push(a.id); }
  }
  store.save();
  return out;
}
