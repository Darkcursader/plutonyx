// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
/**
 * input.ts — keyboard, gamepad and "last input used" tracking. The whole game is playable with any of:
 * mouse, touch, keyboard (arrows / Tab, Enter, 1–9, Esc) or a gamepad (d-pad, A, B, Start).
 */
export type InputKind = 'mouse' | 'touch' | 'keyboard' | 'gamepad';

export class Input {
  kind: InputKind = 'mouse';
  onEscape: () => void = () => {};
  private last: Record<number, boolean> = {};

  constructor(private root: HTMLElement) {
    addEventListener('pointerdown', (e) => this.set(e.pointerType === 'touch' ? 'touch' : 'mouse'), { passive: true });
    addEventListener('keydown', (e) => this.key(e));
    addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('dragstart', (e) => e.preventDefault());
    setInterval(() => this.pollPad(), 90);
  }
  private set(k: InputKind) { if (this.kind !== k) { this.kind = k; document.body.dataset.input = k; } }

  /** The top-most container that should receive navigation. */
  private scope(): HTMLElement {
    const screens = this.root.querySelectorAll<HTMLElement>('.screen');
    return screens.length ? screens[screens.length - 1] : this.root;
  }
  private focusables(): HTMLElement[] { return Array.from(this.scope().querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input')).filter((el) => el.offsetParent !== null); }
  private move(dir: number) {
    const f = this.focusables(); if (!f.length) return;
    const i = f.indexOf(document.activeElement as HTMLElement);
    f[(i + dir + f.length) % f.length].focus();
  }
  private activate() {
    const a = document.activeElement as HTMLElement | null;
    if (a && a !== document.body && this.scope().contains(a)) { a.click(); return; }
    const prim = this.scope().querySelectorAll<HTMLElement>('.btn.primary:not([disabled])');
    prim[prim.length - 1]?.click();
  }
  private escape() {
    const skip = this.root.querySelector<HTMLElement>('.skip'); if (skip) return skip.click();
    this.onEscape();
  }
  private key(e: KeyboardEvent) {
    if ((e.target as HTMLElement)?.tagName === 'INPUT' && e.key !== 'Escape') return;
    this.set('keyboard');
    if (e.key === 'Escape') { e.preventDefault(); this.escape(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); this.move(1); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); this.move(-1); }
    else if (/^[1-9]$/.test(e.key)) { const b = this.scope().querySelector<HTMLElement>(`.choice[data-key="${e.key}"]:not([disabled])`); if (b) { e.preventDefault(); b.click(); } }
    else if (e.key === ' ' && document.activeElement === document.body) { e.preventDefault(); this.activate(); }
  }
  private pollPad() {
    const pad = (navigator.getGamepads?.() ?? []).find((p) => p && p.connected); if (!pad) return;
    const press = (i: number) => { const now = !!pad.buttons[i]?.pressed, was = this.last[i]; this.last[i] = now; return now && !was; };
    const ax = (i: number, dir: number) => { const now = (pad.axes[i] ?? 0) * dir > 0.6, k = 100 + i * 2 + (dir > 0 ? 1 : 0), was = this.last[k]; this.last[k] = now; return now && !was; };
    let used = false;
    if (press(0)) { this.activate(); used = true; }
    if (press(1) || press(9)) { this.escape(); used = true; }
    if (press(13) || press(15) || ax(1, 1) || ax(0, 1)) { this.move(1); used = true; }
    if (press(12) || press(14) || ax(1, -1) || ax(0, -1)) { this.move(-1); used = true; }
    if (used) this.set('gamepad');
  }
}
