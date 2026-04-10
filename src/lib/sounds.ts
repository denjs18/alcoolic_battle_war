/**
 * GameAudio — Web Audio API sound engine
 * All sounds are synthesized (no audio files needed).
 */

export type SoundPreset = "all" | "effects" | "music" | "none";

const STORAGE_KEY = "abw_sound_preset";

class GameAudioEngine {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private fxGain: GainNode | null = null;

  private droneOscillators: OscillatorNode[] = [];
  private pingTimeout: ReturnType<typeof setTimeout> | null = null;
  private ambientStarted = false;

  private _preset: SoundPreset = "all";

  // ── Init ────────────────────────────────────────────────────────────────────
  constructor() {
    if (typeof window !== "undefined") {
      this._preset = (localStorage.getItem(STORAGE_KEY) as SoundPreset) ?? "all";
    }
  }

  get preset(): SoundPreset { return this._preset; }
  get fxEnabled(): boolean { return this._preset === "all" || this._preset === "effects"; }
  get musicEnabled(): boolean { return this._preset === "all" || this._preset === "music"; }

  setPreset(preset: SoundPreset) {
    this._preset = preset;
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, preset);

    if (this.musicGain) {
      this.musicGain.gain.setTargetAtTime(this.musicEnabled ? 0.25 : 0, this.ctx!.currentTime, 0.5);
    }
    if (!this.musicEnabled) this.stopAmbient();
    if (this.musicEnabled && !this.ambientStarted) this.startAmbient();
  }

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicEnabled ? 0.25 : 0;
      this.musicGain.connect(this.ctx.destination);

      this.fxGain = this.ctx.createGain();
      this.fxGain.gain.value = 0.7;
      this.fxGain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  /** Must be called from a user gesture to unlock audio on iOS */
  async resume() {
    const ctx = this.getCtx();
    if (ctx.state === "suspended") await ctx.resume();
  }

  // ── Noise buffer ────────────────────────────────────────────────────────────
  private makeNoise(ctx: AudioContext, duration: number): AudioBufferSourceNode {
    const len = Math.ceil(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }

  // ── Shot fired (cannon) ────────────────────────────────────────────────────
  playShot() {
    if (!this.fxEnabled) return;
    const ctx = this.getCtx();
    const now = ctx.currentTime;

    const noise = this.makeNoise(ctx, 0.25);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(4000, now);
    filter.frequency.exponentialRampToValueAtTime(120, now + 0.25);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.fxGain!);
    noise.start(now);
    noise.stop(now + 0.25);
  }

  // ── Miss — water splash ────────────────────────────────────────────────────
  playSplash() {
    if (!this.fxEnabled) return;
    const ctx = this.getCtx();
    const now = ctx.currentTime;

    // Low "plouf" tone
    const plop = ctx.createOscillator();
    plop.type = "sine";
    plop.frequency.setValueAtTime(280, now);
    plop.frequency.exponentialRampToValueAtTime(55, now + 0.35);
    const plopGain = ctx.createGain();
    plopGain.gain.setValueAtTime(0.7, now);
    plopGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    plop.connect(plopGain);
    plopGain.connect(this.fxGain!);
    plop.start(now);
    plop.stop(now + 0.4);

    // Water noise
    const noise = this.makeNoise(ctx, 2.0);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(1800, now + 0.05);
    bp.frequency.exponentialRampToValueAtTime(350, now + 2.0);
    bp.Q.value = 1.2;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.0, now);
    nGain.gain.linearRampToValueAtTime(0.4, now + 0.06);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
    noise.connect(bp);
    bp.connect(nGain);
    nGain.connect(this.fxGain!);
    noise.start(now + 0.05);
    noise.stop(now + 2.0);
  }

  // ── Hit — explosion ────────────────────────────────────────────────────────
  playExplosion() {
    if (!this.fxEnabled) return;
    const ctx = this.getCtx();
    const now = ctx.currentTime;

    // Noise burst
    const noise = this.makeNoise(ctx, 2.5);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(8000, now);
    lp.frequency.exponentialRampToValueAtTime(180, now + 2.5);
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.0, now);
    nGain.gain.linearRampToValueAtTime(1.0, now + 0.015);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

    // Low rumble
    const rumble = ctx.createOscillator();
    rumble.type = "sawtooth";
    rumble.frequency.setValueAtTime(75, now);
    rumble.frequency.exponentialRampToValueAtTime(25, now + 2.0);
    const rGain = ctx.createGain();
    rGain.gain.setValueAtTime(0.5, now);
    rGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 4;

    noise.connect(lp);
    lp.connect(nGain);
    nGain.connect(comp);
    rumble.connect(rGain);
    rGain.connect(comp);
    comp.connect(this.fxGain!);

    noise.start(now);
    rumble.start(now);
    noise.stop(now + 2.5);
    rumble.stop(now + 2.0);
  }

  // ── Ship sunk — big explosion ──────────────────────────────────────────────
  playShipSunk() {
    if (!this.fxEnabled) return;
    const ctx = this.getCtx();
    const now = ctx.currentTime;

    // Two overlapping explosions
    for (const offset of [0, 0.18]) {
      const noise = this.makeNoise(ctx, 3.5);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(7000, now + offset);
      lp.frequency.exponentialRampToValueAtTime(80, now + offset + 3.5);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now + offset);
      g.gain.linearRampToValueAtTime(0.9, now + offset + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, now + offset + 3.5);
      noise.connect(lp); lp.connect(g); g.connect(this.fxGain!);
      noise.start(now + offset);
      noise.stop(now + offset + 3.5);
    }

    // Deep boom
    const boom = ctx.createOscillator();
    boom.type = "sine";
    boom.frequency.setValueAtTime(55, now);
    boom.frequency.exponentialRampToValueAtTime(20, now + 1.5);
    const bGain = ctx.createGain();
    bGain.gain.setValueAtTime(0.8, now);
    bGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    boom.connect(bGain); bGain.connect(this.fxGain!);
    boom.start(now); boom.stop(now + 1.5);
  }

  // ── Ambient: submarine drone + sonar pings ────────────────────────────────
  startAmbient() {
    if (this.ambientStarted || !this.musicEnabled) return;
    const ctx = this.getCtx();
    const now = ctx.currentTime;

    // Sub-bass drone (two slightly detuned oscillators)
    const freqs = [42, 42.3, 84, 84.7];
    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0, now);
    droneGain.gain.linearRampToValueAtTime(1.0, now + 4);
    droneGain.connect(this.musicGain!);

    for (const f of freqs) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      osc.connect(droneGain);
      osc.start(now);
      this.droneOscillators.push(osc);
    }

    // Ocean noise (very subtle)
    const noise = this.makeNoise(ctx, 9999);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 300;
    const nGain = ctx.createGain();
    nGain.gain.value = 0.08;
    noise.connect(lp); lp.connect(nGain); nGain.connect(this.musicGain!);
    noise.start(now);
    this.droneOscillators.push(noise as unknown as OscillatorNode);

    this.ambientStarted = true;
    this.schedulePing();
  }

  private schedulePing() {
    if (!this.musicEnabled) return;
    const delay = 9000 + Math.random() * 9000;
    this.pingTimeout = setTimeout(() => {
      this.playPing();
      this.schedulePing();
    }, delay);
  }

  private playPing() {
    if (!this.musicEnabled || !this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 760 + Math.random() * 80;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 3.5);
    osc.connect(gain); gain.connect(this.musicGain!);
    osc.start(now); osc.stop(now + 3.5);
  }

  stopAmbient() {
    if (this.pingTimeout) { clearTimeout(this.pingTimeout); this.pingTimeout = null; }
    for (const node of this.droneOscillators) {
      try { (node as AudioBufferSourceNode | OscillatorNode).stop(); } catch { /* already stopped */ }
    }
    this.droneOscillators = [];
    this.ambientStarted = false;
  }
}

// Singleton
export const gameAudio = typeof window !== "undefined" ? new GameAudioEngine() : null;
