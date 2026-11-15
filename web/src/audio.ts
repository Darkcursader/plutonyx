// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
/**
 * audio.ts — every sound is generated in code with the Web Audio API (no recordings, no copyrighted music).
 * Wind, habitat hum (drops as power falls), Geiger clicks (rate follows the real dose rate), an adaptive
 * music pad that tenses as risk rises, and a small set of interface sounds. Optional read-aloud uses the
 * browser's synthetic speech voice.
 */
export class Sound {
  private ctx: AudioContext | null = null;
  private master!: GainNode; private windGain!: GainNode; private windFilter!: BiquadFilterNode; private humGain!: GainNode; private humOsc: OscillatorNode[] = [];
  private musicGain!: GainNode; private tenseGain!: GainNode; private padFilter!: BiquadFilterNode;
  private noise!: AudioBuffer;
  private geigerRate = 0; private tension = 0; private chordTimer = 0; private chord = 0;
  volume = 0.7; readAloud = false;

  /** Call from a user gesture (browsers block audio before one). */
  unlock() {
    if (this.ctx) { void this.ctx.resume(); return; }
    try {
      const ctx = (this.ctx = new AudioContext());
      this.master = ctx.createGain(); this.master.gain.value = this.volume; this.master.connect(ctx.destination);
      const n = (this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)); const d = n.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      // thin Martian wind
      const ws = ctx.createBufferSource(); ws.buffer = n; ws.loop = true;
      this.windFilter = ctx.createBiquadFilter(); this.windFilter.type = 'bandpass'; this.windFilter.frequency.value = 380; this.windFilter.Q.value = 0.7;
      this.windGain = ctx.createGain(); this.windGain.gain.value = 0.05; ws.connect(this.windFilter).connect(this.windGain).connect(this.master); ws.start();
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09; const lg = ctx.createGain(); lg.gain.value = 160; lfo.connect(lg).connect(this.windFilter.frequency); lfo.start();
      // habitat hum
      this.humGain = ctx.createGain(); this.humGain.gain.value = 0.02; const hf = ctx.createBiquadFilter(); hf.type = 'lowpass'; hf.frequency.value = 170; hf.connect(this.humGain).connect(this.master);
      for (const f of [55, 55.6, 110.3]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(hf); o.start(); this.humOsc.push(o); }
      // music
      this.musicGain = ctx.createGain(); this.musicGain.gain.value = 0.0; this.padFilter = ctx.createBiquadFilter(); this.padFilter.type = 'lowpass'; this.padFilter.frequency.value = 900; this.padFilter.connect(this.musicGain).connect(this.master);
      this.tenseGain = ctx.createGain(); this.tenseGain.gain.value = 0; this.tenseGain.connect(this.master);
      this.musicGain.gain.linearRampToValueAtTime(0.11, ctx.currentTime + 6);
      this.nextChord(); this.pulse(); this.geiger();
    } catch { this.ctx = null; }
  }

  private eng: { g: GainNode; o: OscillatorNode[]; f: BiquadFilterNode; rg: GainNode } | null = null;
  /** Rover electric drive: a whine that rises with speed plus gravel rumble. on=false fades it out. */
  engine(on: boolean, speed = 0, rough = 0) {
    const ctx = this.ctx; if (!ctx) return; const t = ctx.currentTime;
    if (!this.eng) {
      const g = ctx.createGain(); g.gain.value = 0; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600; f.connect(g).connect(this.master);
      const o = [70, 140.5, 211].map((fr, i) => { const x = ctx.createOscillator(); x.type = i ? 'triangle' : 'sawtooth'; x.frequency.value = fr; x.connect(f); x.start(); return x; });
      const rs = ctx.createBufferSource(); rs.buffer = this.noise; rs.loop = true; const rf = ctx.createBiquadFilter(); rf.type = 'lowpass'; rf.frequency.value = 260; const rg = ctx.createGain(); rg.gain.value = 0; rs.connect(rf).connect(rg).connect(this.master); rs.start();
      this.eng = { g, o, f, rg };
    }
    const e = this.eng, s = Math.min(1, Math.abs(speed));
    e.g.gain.setTargetAtTime(on ? 0.035 + s * 0.06 : 0, t, 0.15);
    e.o.forEach((o, i) => o.frequency.setTargetAtTime([70, 140.5, 211][i] * (0.8 + s * 1.9), t, 0.12));
    e.f.frequency.setTargetAtTime(500 + s * 1800, t, 0.2);
    e.rg.gain.setTargetAtTime(on ? Math.min(0.5, s * 0.16 + rough * 0.5) : 0, t, 0.1);
  }

  setVolume(v: number) { this.volume = v; if (this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1); if (v === 0) speechSynthesis?.cancel(); }
  /** power 0..100, dust 0..1, tension 0..1, doseRate in µGy/h (real), night 0..1 */
  setScene(p: { power: number; dust: number; tension: number; doseRate: number; inside?: boolean }) {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    this.windGain.gain.setTargetAtTime(0.035 + p.dust * 0.2, t, 1.5); this.windFilter.Q.setTargetAtTime(0.7 + p.dust * 2, t, 1);
    const pw = Math.max(0.15, p.power / 100);
    this.humGain.gain.setTargetAtTime(0.008 + 0.02 * pw, t, 1); this.humOsc.forEach((o, i) => o.frequency.setTargetAtTime([55, 55.6, 110.3][i] * (0.72 + 0.28 * pw), t, 2));
    this.tension = p.tension; this.tenseGain.gain.setTargetAtTime(p.tension * 0.09, t, 1.2); this.padFilter.frequency.setTargetAtTime(700 + p.tension * 1500, t, 2);
    this.geigerRate = Math.min(60, Math.max(0, (p.doseRate - 3) * 0.35) + (p.doseRate > 0 ? 0.25 : 0));
  }

  private nextChord() {
    const ctx = this.ctx!; const t = ctx.currentTime;
    const CH = this.tension > 0.55 ? [[146.8, 174.6, 220, 277.2], [130.8, 155.6, 196, 233.1], [138.6, 164.8, 207.7, 246.9]] : [[146.8, 220, 293.7, 349.2], [174.6, 261.6, 349.2, 440], [130.8, 196, 261.6, 329.6], [164.8, 246.9, 329.6, 392]];
    const notes = CH[this.chord++ % CH.length];
    for (const f of notes) for (const det of [-3, 4]) {
      const o = ctx.createOscillator(); o.type = det < 0 ? 'triangle' : 'sine'; o.frequency.value = f; o.detune.value = det;
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16, t + 3.5); g.gain.linearRampToValueAtTime(0, t + 11);
      o.connect(g).connect(this.padFilter); o.start(t); o.stop(t + 11.2);
    }
    this.chordTimer = window.setTimeout(() => this.nextChord(), 8000);
  }
  private pulse() {
    const ctx = this.ctx!; const t = ctx.currentTime;
    if (this.tension > 0.2) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(73.4, t); o.frequency.exponentialRampToValueAtTime(46, t + 0.22);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3); o.connect(g).connect(this.tenseGain); o.start(t); o.stop(t + 0.32);
    }
    setTimeout(() => this.pulse(), 1000 - this.tension * 480);
  }
  private geiger() {
    const ctx = this.ctx!;
    if (this.geigerRate > 0.05 && this.volume > 0) {
      const s = ctx.createBufferSource(); s.buffer = this.noise; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2600;
      const g = ctx.createGain(); const t = ctx.currentTime; g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.018);
      s.connect(f).connect(g).connect(this.master); s.start(t, Math.random() * 1.5, 0.03);
    }
    const wait = this.geigerRate > 0.05 ? (-Math.log(1 - Math.random()) / this.geigerRate) * 1000 : 400;
    setTimeout(() => this.geiger(), Math.min(4000, Math.max(12, wait)));
  }

  /** Filtered noise with a soft swell: footfalls in dust, breathing inside the helmet. */
  private noiseBurst(freq: number, dur: number, vol: number, attack = 0.01, delay = 0) {
    if (!this.ctx || this.volume === 0) return; const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource(); s.buffer = this.noise; const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.9;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.max(0.01, dur * attack)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.master); s.start(t, Math.random(), dur + 0.05);
  }
  private tone(freq: number, to: number, dur: number, type: OscillatorType = 'triangle', vol = 0.12, delay = 0) {
    if (!this.ctx || this.volume === 0) return; const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }
  play(name: string) {
    switch (name) {
      case 'click': this.tone(880, 1100, 0.07, 'triangle', 0.07); break;
      case 'up': this.tone(520, 780, 0.09, 'triangle', 0.09); break;
      case 'down': this.tone(520, 340, 0.09, 'triangle', 0.09); break;
      case 'deny': this.tone(150, 110, 0.16, 'square', 0.06); break;
      case 'choose': this.tone(587, 587, 0.1, 'triangle', 0.1); this.tone(880, 880, 0.16, 'triangle', 0.1, 0.09); break;
      case 'warn': this.tone(196, 185, 0.22, 'sawtooth', 0.09); this.tone(196, 185, 0.22, 'sawtooth', 0.09, 0.3); break;
      case 'good': this.tone(523, 523, 0.14, 'sine', 0.1); this.tone(659, 659, 0.14, 'sine', 0.1, 0.12); this.tone(784, 784, 0.3, 'sine', 0.1, 0.24); break;
      case 'dawn': this.tone(294, 294, 0.5, 'sine', 0.06); this.tone(440, 440, 0.7, 'sine', 0.05, 0.25); break;
      case 'message': this.tone(1320, 1320, 0.06, 'sine', 0.07); this.tone(1320, 1320, 0.06, 'sine', 0.07, 0.12); this.tone(1760, 1760, 0.12, 'sine', 0.07, 0.24); break;
      case 'radio': this.tone(2400, 1800, 0.035, 'square', 0.025); this.tone(1200, 1200, 0.05, 'sine', 0.03, 0.04); break;
      case 'step': this.tone(95, 48, 0.09, 'sine', 0.10); this.noiseBurst(900, 0.06, 0.035); break;
      case 'breath': this.noiseBurst(520, 1.1, 0.03, 0.45); this.noiseBurst(380, 1.3, 0.022, 0.5, 1.5); break;
      case 'rumble': this.tone(60, 28, 2.4, 'sawtooth', 0.2); break;
    }
  }

  /** Optional read-aloud with the browser's synthetic voice (never a recorded or child's voice). */
  speak(text: string) {
    if (!this.readAloud || !text || !('speechSynthesis' in window)) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text.replace(/µGy/g, 'micrograys')); u.lang = 'en-US'; u.rate = 0.98; u.volume = Math.min(1, this.volume + 0.2); speechSynthesis.speak(u); } catch { /* no voice available */ }
  }
  hush() { try { speechSynthesis?.cancel(); } catch { /* ignore */ } }
}
